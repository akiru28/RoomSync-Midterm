const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepository');
const { success, error } = require('../utils/response');
const { sanitize } = require('../models/User');
const { registerSchema } = require('../validators/authValidator');
const { ROLES } = require('../constants/roles');

const ROLE_VALUES = Object.values(ROLES);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/users/me
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getMe(req, res, next) {
  try {
    if (!req.user) return error(res, 'Authentication required.', 401);
    return success(res, sanitize(req.user), 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/users/me
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateMe(req, res, next) {
  try {
    if (!req.user) return error(res, 'Authentication required.', 401);
    const patch = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      patch.name = req.body.name.trim();
    }
    if (typeof req.body.department === 'string') {
      patch.department = req.body.department.trim();
    }
    if (typeof req.body.password === 'string' && req.body.password.length >= 4) {
      patch.password = await bcrypt.hash(req.body.password, 12);
    }
    const updated = await userRepo.update(req.user.id, patch);
    return success(res, sanitize(updated), 'Profile updated.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getById(req, res, next) {
  try {
    if (String(req.user.id) !== String(req.params.id) && req.user.role !== ROLES.ADMIN) {
      return error(res, 'Forbidden: you may only view your own profile.', 403);
    }
    const user = await userRepo.findById(req.params.id);
    if (!user) return error(res, 'User not found.', 404);
    return success(res, sanitize(user), 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/users (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function listUsers(req, res, next) {
  try {
    const users = await userRepo.findAll();
    return success(res, users, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/users
 */
async function createAdminUser(req, res, next) {
  try {
    const body = req.body || {};
    if (body.role !== undefined && !ROLE_VALUES.includes(body.role)) {
      return error(res, `Role must be one of: ${ROLE_VALUES.join(', ')}.`, 400);
    }
    const { error: validationError, value } = registerSchema(body);
    if (validationError) return error(res, validationError, 400);
    if (value.name.length > 150 || value.email.length > 150 || (value.department || '').length > 150) {
      return error(res, 'Name, email, and department must not exceed 150 characters.', 400);
    }
    if (!EMAIL_PATTERN.test(value.email)) return error(res, 'A valid email address is required.', 400);
    if (await userRepo.findByEmail(value.email)) {
      return error(res, 'User with that email already exists.', 409);
    }

    const user = await userRepo.create({
      ...value,
      password: await bcrypt.hash(value.password, 12),
      role: body.role || ROLES.STUDENT,
      token: null,
    });
    return success(res, sanitize(user), 'User created.', 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/users/:id
 */
async function updateAdminUser(req, res, next) {
  try {
    const body = req.body || {};
    const editableFields = ['name', 'email', 'password', 'role', 'department'];
    const suppliedFields = Object.keys(body).filter((field) => editableFields.includes(field));
    if (!suppliedFields.length) return error(res, 'At least one editable user field is required.', 400);
    const current = await userRepo.findById(req.params.id);
    if (!current) return error(res, 'User not found.', 404);

    const patch = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 150) {
        return error(res, 'Name must be between 2 and 150 characters.', 400);
      }
      patch.name = body.name.trim();
    }
    if (body.email !== undefined) {
      if (typeof body.email !== 'string' || body.email.trim().length > 150 || !EMAIL_PATTERN.test(body.email.trim())) {
        return error(res, 'A valid email address no longer than 150 characters is required.', 400);
      }
      patch.email = body.email.trim().toLowerCase();
      const existing = await userRepo.findByEmail(patch.email);
      if (existing && String(existing.id) !== String(req.params.id)) {
        return error(res, 'User with that email already exists.', 409);
      }
    }
    if (body.department !== undefined) {
      if (typeof body.department !== 'string' || body.department.trim().length > 150) {
        return error(res, 'Department must be a string no longer than 150 characters.', 400);
      }
      patch.department = body.department.trim();
    }
    if (body.role !== undefined) {
      if (!ROLE_VALUES.includes(body.role)) return error(res, `Role must be one of: ${ROLE_VALUES.join(', ')}.`, 400);
      if (String(req.user.id) === String(req.params.id) && body.role !== ROLES.ADMIN) {
        return error(res, 'You cannot remove your own Admin role.', 400);
      }
      patch.role = body.role;
    }
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 4) {
        return error(res, 'Password must be at least 4 characters.', 400);
      }
      patch.password = await bcrypt.hash(body.password, 12);
    }

    if ((patch.role !== undefined && patch.role !== current.role) ||
        (patch.email !== undefined && patch.email !== current.email) ||
        patch.password !== undefined) {
      patch.token = null;
    }
    const updated = await userRepo.update(req.params.id, patch);
    if (!updated) return error(res, 'User not found.', 404);
    return success(res, sanitize(updated), 'User updated.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe, getById, listUsers, createAdminUser, updateAdminUser };
