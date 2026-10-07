const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { toMySqlUtcDateTime, fromMySqlUtcDateTime } = require('../utils/dateUtils');

function normalizeReservationDates(reservation) {
  if (!reservation) return reservation;
  return {
    ...reservation,
    startDate: fromMySqlUtcDateTime(reservation.startDate),
    endDate: fromMySqlUtcDateTime(reservation.endDate),
  };
}

const RESERVATION_COLUMNS = `
  r.id, r.room_id AS roomId, rooms.name AS roomName,
  r.user_id AS userId, users.name AS userName, r.purpose,
  r.program_section AS programSection,
  r.start_date AS startDate, r.end_date AS endDate, r.attendees, r.notes,
  r.status, r.approved_by AS approvedBy, r.approved_at AS approvedAt,
  r.created_at AS createdAt, r.updated_at AS updatedAt
`;
const BASE_QUERY = `FROM reservations r
  JOIN rooms ON rooms.id = r.room_id
  JOIN users ON users.id = r.user_id`;

const RESERVATION_UPDATE_COLUMNS = {
  roomId: 'room_id', userId: 'user_id', purpose: 'purpose', programSection: 'program_section',
  startDate: 'start_date', endDate: 'end_date', attendees: 'attendees', notes: 'notes',
  status: 'status', approvedBy: 'approved_by', approvedAt: 'approved_at',
};

async function findAll(filters) {
  const clauses = [], params = [];
  if (filters) {
    if (filters.roomId != null) { clauses.push('r.room_id = ?'); params.push(filters.roomId); }
    if (filters.userId) { clauses.push('r.user_id = ?'); params.push(filters.userId); }
    if (filters.status) { clauses.push('r.status = ?'); params.push(filters.status); }
    if (filters.start) { clauses.push('r.end_date >= ?'); params.push(filters.start); }
    if (filters.end) { clauses.push('r.start_date <= ?'); params.push(filters.end); }
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await getConnection().execute(
    `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY}${where} ORDER BY r.start_date`,
    params
  );
  return rows.map(normalizeReservationDates);
}

async function findById(id) {
  const [rows] = await getConnection().execute(
    `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY} WHERE r.id = ? LIMIT 1`, [id]
  );
  return normalizeReservationDates(rows[0] || null);
}

async function findByRoomAndRange(roomId, start, end) {
  const [rows] = await getConnection().execute(
    `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY}
     WHERE r.room_id = ? AND r.start_date < ? AND r.end_date > ?
       AND r.status NOT IN ('rejected', 'cancelled')
     ORDER BY r.start_date`,
    [roomId, toMySqlUtcDateTime(end), toMySqlUtcDateTime(start)]
  );
  return rows.map(normalizeReservationDates);
}

async function findByDateRange(start, end) {
  const [rows] = await getConnection().execute(
    `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY}
     WHERE r.start_date < ? AND r.end_date > ?
     ORDER BY r.start_date`,
    [toMySqlUtcDateTime(end), toMySqlUtcDateTime(start)]
  );
  return rows.map(normalizeReservationDates);
}

async function findSchedule(filters = {}) {
  const clauses = ["r.status = 'approved'"];
  const params = [];
  if (filters.roomId != null) { clauses.push('r.room_id = ?'); params.push(filters.roomId); }
  if (filters.start) { clauses.push('r.end_date >= ?'); params.push(filters.start); }
  if (filters.end) { clauses.push('r.start_date <= ?'); params.push(filters.end); }
  const [rows] = await getConnection().execute(
    `SELECT rooms.name AS roomName, r.start_date AS startDate, r.end_date AS endDate,
            r.status
     FROM reservations r
     JOIN rooms ON rooms.id = r.room_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY r.start_date`,
    params
  );
  return rows.map(normalizeReservationDates);
}

async function create(data) {
  const result = await createIfAvailable(data);
  if (result.conflicts.length) {
    const error = new Error('Room is already reserved in that time range.');
    error.status = 409;
    error.meta = { conflicts: result.conflicts };
    throw error;
  }
  if (!result.reservation) {
    const error = new Error('Room was not found.');
    error.status = 404;
    throw error;
  }
  return result.reservation;
}

async function saveIfAvailable(data, id) {
  const pool = getConnection();
  const connection = await pool.getConnection();
  let transactionStarted = false;
  let originalRoomId;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (id) {
      const [existing] = await connection.execute(
        `SELECT id, room_id AS roomId, start_date AS startDate, end_date AS endDate
         FROM reservations WHERE id = ? FOR UPDATE`,
        [id]
      );
      if (!existing.length) {
        await connection.rollback();
        transactionStarted = false;
        return { reservation: null, conflicts: [] };
      }
      originalRoomId = Number(existing[0].roomId);
      data = {
        ...data,
        roomId: data.roomId ?? existing[0].roomId,
        startDate: data.startDate ?? existing[0].startDate,
        endDate: data.endDate ?? existing[0].endDate,
      };
    }

    const roomId = Number(data.roomId);
    // Lock rooms in a stable order so concurrent writes cannot race the conflict query.
    const roomIdsToLock = [...new Set([originalRoomId, roomId].filter(Number.isFinite))]
      .sort((left, right) => left - right);
    for (const roomIdToLock of roomIdsToLock) {
      const [rooms] = await connection.execute(
        'SELECT id FROM rooms WHERE id = ? FOR UPDATE',
        [roomIdToLock]
      );
      if (!rooms.length) {
        await connection.rollback();
        transactionStarted = false;
        return { reservation: null, conflicts: [] };
      }
    }

    const conflictParams = [roomId, toMySqlUtcDateTime(data.endDate), toMySqlUtcDateTime(data.startDate)];
    let excludeClause = '';
    if (id) {
      excludeClause = ' AND r.id <> ?';
      conflictParams.push(id);
    }
    const [conflicts] = await connection.execute(
      `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY}
       WHERE r.room_id = ? AND r.start_date < ? AND r.end_date > ?
         AND r.status NOT IN ('rejected', 'cancelled')${excludeClause}
       ORDER BY r.start_date`,
      conflictParams
    );
    if (conflicts.length) {
      await connection.rollback();
      transactionStarted = false;
      return { reservation: null, conflicts: conflicts.map(normalizeReservationDates) };
    }

    if (id) {
      const entries = Object.entries(data).filter(([key]) => RESERVATION_UPDATE_COLUMNS[key]);
      const assignments = entries.map(([key]) => `${RESERVATION_UPDATE_COLUMNS[key]} = ?`).join(', ');
      const values = entries.map(([key, value]) =>
        key === 'startDate' || key === 'endDate' ? toMySqlUtcDateTime(value) : value
      );
      if (entries.length) {
        await connection.execute(
          `UPDATE reservations
           SET ${assignments}, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [...values, id]
        );
      }
    } else {
      const reservationId = data.id || generateId('res');
      await connection.execute(
        `INSERT INTO reservations
          (id, room_id, user_id, purpose, program_section, start_date, end_date, attendees, notes, status, approved_by, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reservationId, data.roomId, data.userId, data.purpose, data.programSection,
          toMySqlUtcDateTime(data.startDate), toMySqlUtcDateTime(data.endDate),
          data.attendees || 1, data.notes || '', data.status || 'pending',
          data.approvedBy || null, data.approvedAt || null]
      );
      id = reservationId;
    }

    const [rows] = await connection.execute(
      `SELECT ${RESERVATION_COLUMNS} ${BASE_QUERY} WHERE r.id = ? LIMIT 1`,
      [id]
    );
    await connection.commit();
    transactionStarted = false;
    return { reservation: normalizeReservationDates(rows[0] || null), conflicts: [] };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createIfAvailable(data) {
  return saveIfAvailable(data);
}

async function updateIfAvailable(id, patch) {
  return saveIfAvailable(patch, id);
}

async function update(id, patch) {
  if (['roomId', 'startDate', 'endDate'].some((key) =>
    Object.prototype.hasOwnProperty.call(patch || {}, key)
  )) {
    const result = await updateIfAvailable(id, patch);
    if (result.conflicts.length) {
      const error = new Error('Room is already reserved in that time range.');
      error.status = 409;
      error.meta = { conflicts: result.conflicts };
      throw error;
    }
    return result.reservation;
  }
  const entries = Object.entries(patch || {}).filter(([key]) => RESERVATION_UPDATE_COLUMNS[key]);
  if (!entries.length) return findById(id);
  const assignments = entries.map(([key]) => `${RESERVATION_UPDATE_COLUMNS[key]} = ?`).join(', ');
  const values = entries.map(([key, value]) =>
    key === 'startDate' || key === 'endDate' ? toMySqlUtcDateTime(value) : value
  );
  const [result] = await getConnection().execute(
    `UPDATE reservations SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, id]
  );
  return result.affectedRows ? findById(id) : null;
}

async function remove(id) {
  const [result] = await getConnection().execute('DELETE FROM reservations WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function updateStatus(id, status, actorId) {
  const patch = { status };
  if (status === 'approved') {
    patch.approvedBy = actorId || null;
    patch.approvedAt = new Date();
  }
  return update(id, patch);
}

async function count(filter) {
  const rows = await findAll(filter);
  return rows.length;
}

module.exports = {
  findAll, findById, findByRoomAndRange, findByDateRange, findSchedule,
  create, createIfAvailable, updateIfAvailable, update, remove, updateStatus, count,
};
