const path = require('path');
const env = require('../config/environment');
const { error } = require('../utils/response');

/**
 * 404 handler — returns JSON error for API routes, or serves the home page
 * as a SPA-style fallback for non-API paths.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return error(res, 'Not found.', 404);
  }
  const pagesDir = path.resolve(__dirname, '../../public/pages');
  return res.status(404).sendFile(path.join(pagesDir, 'home.html'));
}

/**
 * Global error handler.
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {number} [defaultStatus=500]
 */
function globalError(err, req, res, next, defaultStatus = 500) {
  const status = err && typeof err.status === 'number' ? err.status : defaultStatus;
  const message = err && err.message ? err.message : 'Internal server error.';
  if (env.nodeEnv === 'development' || env.nodeEnv === 'dev') {
    if (err && err.stack) {
      console.error('[error]', err.stack);
    }
  } else {
    console.error(`[error ${status}] ${message}`);
  }
  return error(res, message, status);
}

module.exports = { notFound, globalError };
