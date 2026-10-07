const { ROLES } = require('../constants/roles');

/**
 * User model field spec and defaults.
 */
const User = {
  name: 'User',
  fields: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    role: { type: 'enum', values: Object.values(ROLES), default: ROLES.STUDENT },
    department: { type: 'string', required: false },
    token: { type: 'string', required: false },
    createdAt: { type: 'date', required: true },
    updatedAt: { type: 'date', required: true },
  },
};

/**
 * Strip password and token from user object before returning to client.
 * @param {object|null|undefined} user - Raw user record
 * @returns {object|null}
 */
function sanitize(user) {
  if (!user) return null;
  const { password, token, ...publicUser } = user;
  return publicUser;
}

module.exports = { User, sanitize };
