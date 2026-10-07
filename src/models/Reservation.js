const { RESERVATION_STATUSES } = require('../constants/roles');
const { diffInMinutes } = require('../utils/dateUtils');

/**
 * Reservation model field spec and defaults.
 */
const Reservation = {
  name: 'Reservation',
  fields: {
    id: { type: 'string', required: true },
    roomId: { type: 'any', required: true },
    roomName: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    userName: { type: 'string', required: true },
    purpose: { type: 'string', required: true },
    startDate: { type: 'date', required: true },
    endDate: { type: 'date', required: true },
    attendees: { type: 'number', default: 1 },
    notes: { type: 'string', default: '' },
    status: { type: 'enum', values: Object.values(RESERVATION_STATUSES), default: RESERVATION_STATUSES.PENDING },
    approvedBy: { type: 'string', required: false },
    approvedAt: { type: 'date', required: false },
    createdAt: { type: 'date', required: true },
    updatedAt: { type: 'date', required: true },
  },
};

/**
 * Compute reservation duration in minutes.
 * @param {object} res - Reservation record
 * @returns {number}
 */
function durationMinutes(res) {
  if (!res || !res.startDate || !res.endDate) return 0;
  return diffInMinutes(res.startDate, res.endDate);
}

module.exports = { Reservation, durationMinutes };
