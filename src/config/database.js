const mysql = require('mysql2/promise');
const env = require('./environment');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

/**
 * Verify database connectivity during application startup.
 * @returns {Promise<void>}
 */
async function init() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
    console.log('[database] Connected to MySQL');
  } finally {
    connection.release();
  }
}

function getConnection() {
  return pool;
}

module.exports = { init, getConnection };
