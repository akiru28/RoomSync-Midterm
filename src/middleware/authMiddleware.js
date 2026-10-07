const env = require('../config/environment');
const { error } = require('../utils/response');
const userRepository = require('../repositories/userRepository');
const { SESSION_COOKIE, CAN_RESERVE_ROLES, ROLES } = require('../constants/roles');
const { verifyToken } = require('../utils/generateId');

const DEV_BYPASS_TOKEN = 'dev-bypass-admin-token';

function parseCookies(req) {
  if (req.cookies) return req.cookies;
  const raw = req.headers.cookie || '';
  const out = {};
  if (!raw) return out;
  raw.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      out[key] = val.slice(1, -1);
    } else {
      try { out[key] = decodeURIComponent(val); } catch (_) { out[key] = val; }
    }
  });
  req.cookies = out;
  return out;
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  const cookies = parseCookies(req);
  const cookie = cookies[SESSION_COOKIE];
  if (cookie) {
    return String(cookie).trim();
  }
  return null;
}

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return error(res, 'Authentication required.', 401);
  }

  if ((env.nodeEnv === 'development' || env.nodeEnv === 'dev') && token === DEV_BYPASS_TOKEN) {
    req.user = {
      id: 'dev-bypass-admin',
      name: 'Dev Bypass',
      email: 'dev@local',
      role: 'admin',
      department: 'Development',
    };
    return next();
  }
  if (!verifyToken(token, env.jwt.secret)) {
    return error(res, 'Invalid or expired token.', 401);
  }

  let user;
  try {
    user = await userRepository.findByToken(token);
  } catch (err) {
    return next(err);
  }
  if (!user) {
    return error(res, 'Invalid or expired token.', 401);
  }
  req.user = user;
  return next();
}

async function pageAuthenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  if ((env.nodeEnv === 'development' || env.nodeEnv === 'dev') && token === DEV_BYPASS_TOKEN) {
    req.user = {
      id: 'dev-bypass-admin',
      name: 'Dev Bypass',
      email: 'dev@local',
      role: 'admin',
      department: 'Development',
    };
    return next();
  }
  if (!verifyToken(token, env.jwt.secret)) {
    req.user = null;
    return next();
  }
  try {
    req.user = (await userRepository.findByToken(token)) || null;
  } catch (_) {
    req.user = null;
  }
  return next();
}

function pageRequireAuth(redirectTo = '/login.html') {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect(redirectTo);
    }
    return next();
  };
}

function pageRequireRole(...allowed) {
  const allowedSet = new Set(allowed.flat());
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/login.html');
    }
    if (!allowedSet.has(req.user.role)) {
      return res.redirect('/dashboard.html');
    }
    return next();
  };
}

function pageRequireCanReserve() {
  return pageRequireRole(CAN_RESERVE_ROLES);
}

function pageRequireAdmin() {
  return pageRequireRole(ROLES.ADMIN);
}

module.exports = {
  authenticate,
  pageAuthenticate,
  pageRequireAuth,
  pageRequireRole,
  pageRequireCanReserve,
  pageRequireAdmin,
  extractToken,
};
