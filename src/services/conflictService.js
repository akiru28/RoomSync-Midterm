const reservationRepo = require('../repositories/reservationRepository');

/**
 * Check for scheduling conflicts on a given room/range.
 * Uses overlap rule: !(a.end <= b.start || a.start >= b.end).
 * @param {any} roomId
 * @param {string|Date} start
 * @param {string|Date} end
 * @param {string} [excludeReservationId] - Ignore this reservation id (useful for updates)
 * @returns {Promise<{hasConflict: boolean, conflicts: Array}>}
 */
async function checkConflict(roomId, start, end, excludeReservationId) {
  const existing = await reservationRepo.findByRoomAndRange(roomId, start, end);
  const conflicts = existing.filter((r) => r.id !== excludeReservationId);
  return { hasConflict: conflicts.length > 0, conflicts };
}

/**
 * List all conflicts within a given date range, optionally filtered by room.
 * @param {string|Date} start
 * @param {string|Date} end
 * @param {any} [roomId]
 * @returns {Promise<Array>}
 */
async function listConflictsForRange(start, end, roomId) {
  const inRange = await reservationRepo.findByDateRange(start, end);
  const filtered = typeof roomId === 'undefined' || roomId == null
    ? inRange
    : inRange.filter((r) => String(r.roomId) === String(roomId));

  const result = [];
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const a = filtered[i];
      const b = filtered[j];
      if (String(a.roomId) !== String(b.roomId)) continue;
      const aStart = new Date(a.startDate).getTime();
      const aEnd = new Date(a.endDate).getTime();
      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      if (!(aEnd <= bStart || aStart >= bEnd)) {
        result.push([a, b]);
      }
    }
  }
  return result;
}

module.exports = { checkConflict, listConflictsForRange };
