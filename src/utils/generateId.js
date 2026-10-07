const crypto = require('crypto');

/**
 * Generate a short human-friendly id with prefix, timestamp and random suffix.
 * @param {string} [prefix='id'] - Id prefix
 * @returns {string}
 */
function generateId(prefix = 'id') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Parse a JWT duration such as 7d into seconds.
 * @param {string} value - JWT duration
 * @returns {number}
 */
function expirationSeconds(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value || '7d');
  if (!match) throw new Error('JWT_EXPIRES_IN must use an integer followed by s, m, h, or d.');
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * units[match[2]];
}

function generateToken(secret = 'dev-only-change-me', expiresIn = '7d') {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: issuedAt,
    exp: issuedAt + expirationSeconds(expiresIn),
    jti: crypto.randomBytes(16).toString('base64url'),
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyToken(token, secret = 'dev-only-change-me') {
  if (typeof token !== 'string') return false;
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra !== undefined) return false;
  let claims;
  try {
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT' ||
        !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return false;
  } catch (_) {
    return false;
  }
  const unsigned = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch (_) {
    return false;
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { generateId, generateToken, verifyToken };
