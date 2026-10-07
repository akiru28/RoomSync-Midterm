const { ROOM_TYPES } = require('../constants/roles');

/**
 * Room model field spec and defaults.
 */
const Room = {
  name: 'Room',
  fields: {
    id: { type: 'any', required: true },
    name: { type: 'string', required: true },
    code: { type: 'string', required: true, unique: true },
    type: { type: 'enum', values: Object.values(ROOM_TYPES), required: true },
    capacity: { type: 'number', required: true },
    location: { type: 'string', required: false },
    features: { type: 'string[]', required: false, default: [] },
    description: { type: 'string', required: false },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'date', required: true },
    updatedAt: { type: 'date', required: true },
  },
};

/**
 * Check if a room has a specific feature (case-insensitive).
 * @param {object} room - Room record
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function hasFeature(room, feature) {
  if (!room || !Array.isArray(room.features) || !feature) return false;
  const target = String(feature).toLowerCase();
  return room.features.some((f) => String(f).toLowerCase() === target);
}

module.exports = { Room, hasFeature };
