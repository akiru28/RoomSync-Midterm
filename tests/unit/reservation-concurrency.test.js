const assert = require('node:assert/strict');
const test = require('node:test');
const { getConnection } = require('../../src/config/database');
const reservationRepository = require('../../src/repositories/reservationRepository');

test('simultaneous overlapping reservations for one room allow only one write', async (t) => {
  const pool = getConnection();
  const originalGetConnection = pool.getConnection;
  const reservations = [];
  const roomLocks = new Map();
  const executedStatements = [];

  function makeConnection() {
    let stagedReservation;
    const heldLocks = [];

    async function acquireRoomLock(roomId) {
      let lock = roomLocks.get(roomId);
      if (!lock) {
        lock = { held: false, waiters: [] };
        roomLocks.set(roomId, lock);
      }
      if (lock.held) {
        await new Promise((resolve) => lock.waiters.push(resolve));
      } else {
        lock.held = true;
      }
      heldLocks.push(lock);
    }

    function releaseLocks() {
      for (const lock of heldLocks.splice(0)) {
        const next = lock.waiters.shift();
        if (next) next();
        else lock.held = false;
      }
    }

    return {
      async beginTransaction() {},
      async commit() {
        if (stagedReservation) reservations.push(stagedReservation);
        stagedReservation = null;
        releaseLocks();
      },
      async rollback() {
        stagedReservation = null;
        releaseLocks();
      },
      release: releaseLocks,
      async execute(sql, params) {
        executedStatements.push(sql);
        if (sql.includes('SELECT id FROM rooms WHERE id = ? FOR UPDATE')) {
          await acquireRoomLock(Number(params[0]));
          return [[{ id: Number(params[0]) }]];
        }
        if (sql.includes('WHERE r.room_id = ?')) {
          const [roomId, endDate, startDate] = params;
          const conflicts = reservations.filter((reservation) =>
            reservation.roomId === roomId &&
            !['rejected', 'cancelled'].includes(reservation.status) &&
            reservation.startDate < endDate &&
            reservation.endDate > startDate
          );
          return [conflicts];
        }
        if (sql.startsWith('INSERT INTO reservations')) {
          const [id, roomId, userId, purpose, programSection, startDate, endDate,
            attendees, notes, status] = params;
          stagedReservation = {
            id, roomId, userId, purpose, programSection, startDate, endDate,
            attendees, notes, status,
          };
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('WHERE r.id = ? LIMIT 1')) {
          const reservation = stagedReservation?.id === params[0]
            ? stagedReservation
            : reservations.find((entry) => entry.id === params[0]);
          return [reservation ? [reservation] : []];
        }
        throw new Error(`Unexpected SQL in test: ${sql}`);
      },
    };
  }

  pool.getConnection = async () => makeConnection();
  t.after(() => { pool.getConnection = originalGetConnection; });

  const reservation = {
    roomId: 7,
    userId: 'instructor-1',
    purpose: 'Class',
    programSection: 'CS-1',
    startDate: '2026-10-05T08:00:00.000Z',
    endDate: '2026-10-05T09:00:00.000Z',
    attendees: 20,
    notes: '',
    status: 'pending',
  };
  const results = await Promise.all([
    reservationRepository.createIfAvailable(reservation),
    reservationRepository.createIfAvailable(reservation),
  ]);

  assert.equal(results.filter((result) => result.reservation).length, 1);
  assert.equal(results.filter((result) => result.conflicts.length === 1).length, 1);
  assert.ok(executedStatements.some((sql) => sql.includes('SELECT id FROM rooms WHERE id = ? FOR UPDATE')));
});
