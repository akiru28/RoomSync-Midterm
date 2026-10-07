const authService = require('../services/authService');
const env = require('../config/environment');
const { success, error } = require('../utils/response');

const secureCookie = env.nodeEnv === 'production' || env.nodeEnv === 'prod';

/**
 * POST /api/auth/register
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function register(req, res, next) {
  try {
    const { user, token } = await authService.register(req.body);
    authService.attachSessionCookie(res, token, secureCookie);
    return success(res, { user, token }, 'Account created successfully.', 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const { user, token } = await authService.login(email, password);
    authService.attachSessionCookie(res, token, secureCookie);
    return success(res, { user, token }, 'Login successful.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function me(req, res, next) {
  try {
    if (!req.user) return error(res, 'Authentication required.', 401);
    const user = await authService.me(req.user.id);
    return success(res, user, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function logout(req, res, next) {
  try {
    if (req.user) {
      await authService.logout(req.user.id);
    }
    authService.clearSessionCookie(res);
    return success(res, null, 'Logged out successfully.');
  } catch (err) {
    authService.clearSessionCookie(res);
    return next(err);
  }
}

module.exports = { register, login, me, logout };
