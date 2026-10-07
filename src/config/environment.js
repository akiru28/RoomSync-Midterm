const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  });
}

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '3000', 10);

const isProduction = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-change-me');
if (isProduction && (jwtSecret.length < 32 || jwtSecret === 'dev-only-change-me')) {
  throw new Error('[environment] Production requires a JWT_SECRET of at least 32 characters.');
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

const config = {
  nodeEnv,
  port,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwt: {
    secret: jwtSecret,
    expiresIn: jwtExpiresIn,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'lecture_room_reservation',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'no-reply@school.edu',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    maxBytes: parseInt(process.env.MAX_UPLOAD_BYTES || '10485760', 10),
  },
};

module.exports = config;
