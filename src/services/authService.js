const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepository');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const { generateToken } = require('../utils/generateId');
const { sanitize } = require('../models/User');
const { ROLES, SESSION_COOKIE } = require('../constants/roles');
const env = require('../config/environment');

const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function attachSessionCookie(res, token, secure) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
    secure: Boolean(secure),
  };
  res.cookie(SESSION_COOKIE, token, opts);
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Register a new user account.
 * @param {object} payload
 * @returns {Promise<{user: object, token: string}>}
 */
async function register(payload) {
  const { error, value } = registerSchema(payload);
  if (error) {
    const err = new Error(error);
    err.status = 400;
    throw err;
  }

  const existing = await userRepo.findByEmail(value.email);
  if (existing) {
    const err = new Error('User with that email already exists.');
    err.status = 409;
    throw err;
  }

  const user = await userRepo.create({
    name: value.name,
    email: value.email,
    password: await bcrypt.hash(value.password, 12),
    role: ROLES.STUDENT,
    department: value.department,
    token: null,
  });
  const token = generateToken(env.jwt.secret, env.jwt.expiresIn);
  await userRepo.updateToken(user.id, token);
  user.token = token;

  return { user: sanitize(user), token };
}

/**
 * Login with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object, token: string}>}
 */
async function login(email, password) {
  const { error, value } = loginSchema({ email, password });
  if (error) {
    const err = new Error(error);
    err.status = 400;
    throw err;
  }

  const user = await userRepo.findByEmail(value.email);
  const passwordIsHashed = user && /^\$2[aby]\$\d\d\$/.test(user.password);
  const passwordMatches = user && (passwordIsHashed
    ? await bcrypt.compare(value.password, user.password)
    : user.password === value.password);
  if (!passwordMatches) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  if (!passwordIsHashed) {
    user.password = await bcrypt.hash(value.password, 12);
    await userRepo.update(user.id, { password: user.password });
  }

  const token = generateToken(env.jwt.secret, env.jwt.expiresIn);
  await userRepo.updateToken(user.id, token);
  user.token = token;
  return { user: sanitize(user), token };
}

/**
 * Logout by invalidating user token.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function logout(userId) {
  const invalidated = `logged-out-${Date.now()}`;
  await userRepo.updateToken(userId, invalidated);
  return Promise.resolve(true);
}

/**
 * Fetch current (sanitized) user by id.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function me(userId) {
  const user = await userRepo.findById(userId);
  return Promise.resolve(sanitize(user));
}

module.exports = { register, login, logout, me, attachSessionCookie, clearSessionCookie };
