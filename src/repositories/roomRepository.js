const { getConnection } = require('../config/database');

const ROOM_COLUMNS = `
  id, name, code, type, capacity, location, features, description,
  is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
`;

function mapRoom(room) {
  if (!room) return null;
  let features = room.features;
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch (_) { features = []; }
  }
  return { ...room, features: Array.isArray(features) ? features : [] };
}

async function findAll(filters) {
  const clauses = [];
  const params = [];
  if (filters && filters.type) { clauses.push('type = ?'); params.push(filters.type); }
  if (filters && typeof filters.minCapacity === 'number' && Number.isFinite(filters.minCapacity)) {
    clauses.push('capacity >= ?'); params.push(filters.minCapacity);
  }
  if (filters && filters.search) {
    clauses.push('(name LIKE ? OR code LIKE ? OR location LIKE ?)');
    const search = `%${filters.search}%`;
    params.push(search, search, search);
  }
  if (filters && filters.activeOnly) clauses.push('is_active = TRUE');
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await getConnection().execute(
    `SELECT ${ROOM_COLUMNS} FROM rooms${where} ORDER BY name`,
    params
  );
  return rows.map(mapRoom);
}

async function findById(id) {
  const [rows] = await getConnection().execute(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id = ? LIMIT 1`, [id]);
  return mapRoom(rows[0]);
}

async function findByCode(code) {
  const [rows] = await getConnection().execute(
    `SELECT ${ROOM_COLUMNS} FROM rooms WHERE UPPER(code) = UPPER(?) LIMIT 1`,
    [code]
  );
  return mapRoom(rows[0]);
}

async function create(data) {
  const [result] = await getConnection().execute(
    `INSERT INTO rooms (name, code, type, capacity, location, features, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name, data.code, data.type, data.capacity, data.location || '',
      JSON.stringify(Array.isArray(data.features) ? data.features : []),
      data.description || '', typeof data.isActive === 'boolean' ? data.isActive : true,
    ]
  );
  return findById(data.id || result.insertId);
}

async function update(id, patch) {
  const fields = { name: 'name', code: 'code', type: 'type', capacity: 'capacity', location: 'location',
    description: 'description', isActive: 'is_active' };
  const entries = Object.entries(patch || {}).filter(([key]) => fields[key]);
  if (Object.prototype.hasOwnProperty.call(patch || {}, 'features')) entries.push(['features', 'features']);
  if (!entries.length) return findById(id);
  const assignments = entries.map(([key]) => `${fields[key] || key} = ?`).join(', ');
  const values = entries.map(([key, value]) => key === 'features'
    ? JSON.stringify(Array.isArray(value) ? value : []) : value);
  const [result] = await getConnection().execute(
    `UPDATE rooms SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, id]
  );
  return result.affectedRows ? findById(id) : null;
}

async function remove(id) {
  const [result] = await getConnection().execute('DELETE FROM rooms WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function findAvailable(start, end, roomId) {
  const roomClause = roomId == null ? '' : 'AND r.id = ?';
  const params = roomId == null ? [end, start] : [end, start, roomId];
  const [rows] = await getConnection().execute(
    `SELECT ${ROOM_COLUMNS} FROM rooms r
     WHERE r.is_active = TRUE
       ${roomClause}
       AND NOT EXISTS (
         SELECT 1 FROM reservations x
         WHERE x.room_id = r.id AND x.start_date < ? AND x.end_date > ?
           AND x.status NOT IN ('rejected', 'cancelled')
       )
     ORDER BY r.name`,
    params
  );
  return rows.map(mapRoom);
}

async function checkFeatures(id, requiredFeatures) {
  if (!Array.isArray(requiredFeatures) || requiredFeatures.length === 0) return true;
  const room = await findById(id);
  if (!room) return false;
  const existing = new Set(room.features.map((feature) => String(feature).toLowerCase()));
  return requiredFeatures.every((feature) => existing.has(String(feature).toLowerCase()));
}

module.exports = { findAll, findById, findByCode, create, update, remove, findAvailable, checkFeatures };
