const {
  ROLES,
  CAN_RESERVE_ROLES,
  CAN_APPROVE_ROLES,
  CAN_MANAGE_ROLES,
} = require('../constants/roles');
const { error } = require('../utils/response');

/**
 * Return middleware that checks if req.user.role is in allowed list.
 * @param {...string} allowed - Allowed role values
 * @returns {import('express').RequestHandler}
 */
function requireRole(...allowed) {
  const allowedSet = new Set(allowed.flat());
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }
    if (!allowedSet.has(req.user.role)) {
      return error(res, 'Forbidden: insufficient role.', 403);
    }
    return next();
  };
}

const requireAdmin = requireRole(ROLES.ADMIN);

const requireCanReserve = requireRole(CAN_RESERVE_ROLES);

const requireCanApprove = requireRole(CAN_APPROVE_ROLES);

const requireCanManage = requireRole(CAN_MANAGE_ROLES);

module.exports = {
  requireRole,
  requireAdmin,
  requireCanReserve,
  requireCanApprove,
  requireCanManage,
};
