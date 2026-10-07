const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
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

const env = require('./config/environment');
const database = require('./config/database');
const app = require('./app');

async function start() {
  await database.init();
  const server = app.listen(env.port, () => {
    console.log(`RoomSync server listening on http://localhost:${env.port}`);
  });
  return server;
}

let serverInstance = null;
if (require.main === module) {
  start().catch((err) => {
    console.error('[server] startup failed:', err);
    process.exit(1);
  });
} else {
  serverInstance = start();
}

module.exports = { start };
