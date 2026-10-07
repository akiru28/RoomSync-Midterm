const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');
const { sanitize } = require('../models/User');

const USER_COLUMNS = `
  id, name, email, password, role, department, token,
  created_at AS createdAt, updated_at AS updatedAt
`;

async function findAll() {
  const [rows] = await getConnection().query(`SELECT ${USER_COLUMNS} FROM users ORDER BY name`);
  return rows.map(sanitize);
}

async function findById(id) {
  const [rows] = await getConnection().execute(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await getConnection().execute(
    `SELECT ${USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findByToken(token) {
  const [rows] = await getConnection().execute(`SELECT ${USER_COLUMNS} FROM users WHERE token = ? LIMIT 1`, [token]);
  return rows[0] || null;
}

async function create(data) {
  const user = {
    id: data.id || generateId('user'),
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role || 'student',
    department: data.department || '',
    token: data.token || null,
  };
  await getConnection().execute(
    `INSERT INTO users (id, name, email, password, role, department, token)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.email, user.password, user.role, user.department, user.token]
  );
  return findById(user.id);
}

async function update(id, patch) {
  const allowed = ['name', 'email', 'password', 'role', 'department', 'token'];
  const entries = Object.entries(patch || {}).filter(([key]) => allowed.includes(key));
  if (!entries.length) return findById(id);
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  const [result] = await getConnection().execute(
    `UPDATE users SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, id]
  );
  return result.affectedRows ? findById(id) : null;
}

async function remove(id) {
  const [result] = await getConnection().execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function updateToken(id, token) {
  return update(id, { token });
}

module.exports = { findAll, findById, findByEmail, findByToken, create, update, remove, updateToken };
