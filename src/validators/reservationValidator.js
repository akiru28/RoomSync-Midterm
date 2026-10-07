const {
  RESERVATION_MIN_MINUTES,
  RESERVATION_MAX_HOURS,
  RESERVATION_STATUSES,
} = require('../constants/roles');

/**
 * Validate reservation creation payload.
 * Mirrors legacy server.js validateReservationPayload behaviour.
 * @param {object} payload - Reservation data
 * @returns {string|null} Error string or null if valid
 */
function createReservation(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Reservation payload is required.';
  }

  const roomId = Number(payload.roomId ?? payload.room_id);
  if (!Number.isFinite(roomId) || roomId < 1) {
    return 'A valid roomId is required.';
  }

  const purpose = String(payload.purpose || '').trim();
  if (!purpose) {
    return 'Purpose is required.';
  }

  const programSection = String(payload.programSection || '').trim();
  if (!programSection) {
    return 'Program/section is required.';
  }
  if (programSection.length > 150) {
    return 'Program/section must not exceed 150 characters.';
  }

  const start = new Date(payload.startDate ?? payload.start_time);
  const end = new Date(payload.endDate ?? payload.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Valid startDate and endDate are required.';
  }

  if (start >= end) {
    return 'End time must be after the start time.';
  }

  const minutes = (end.getTime() - start.getTime()) / 60000;
  if (minutes < RESERVATION_MIN_MINUTES) {
    return `Minimum reservation length is ${RESERVATION_MIN_MINUTES} minutes.`;
  }

  if (minutes > RESERVATION_MAX_HOURS * 60) {
    return `Maximum reservation length is ${RESERVATION_MAX_HOURS} hours.`;
  }

  if (start.getTime() < Date.now() - 60000) {
    return 'Start time cannot be in the past.';
  }

  const attendees = Number(payload.attendees ?? 1);
  if (!Number.isFinite(attendees) || attendees < 1) {
    return 'Attendees must be at least 1.';
  }

  return null;
}

/**
 * Validate reservation status value.
 * @param {string} status - Candidate status
 * @returns {string|null} Error string or null if valid
 */
function updateStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  const allowed = Object.values(RESERVATION_STATUSES);
  if (!allowed.includes(s)) {
    return `Invalid status. Must be one of: ${allowed.join(', ')}.`;
  }
  return null;
}

module.exports = { createReservation, updateStatus };
