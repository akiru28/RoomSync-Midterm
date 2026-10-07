const { getConnection } = require('../config/database');

const EQUIPMENT_COLUMNS = `id, room_id AS roomId, code, name, description, status,
  created_at AS createdAt, updated_at AS updatedAt`;

async function findAll(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.roomId != null) {
    clauses.push('room_id = ?');
    params.push(filters.roomId);
  }
  if (!filters.includeRetired) clauses.push("status <> 'retired'");
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await getConnection().execute(
    `SELECT ${EQUIPMENT_COLUMNS} FROM equipment${where} ORDER BY name`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await getConnection().execute(
    `SELECT ${EQUIPMENT_COLUMNS} FROM equipment WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCode(code) {
  const [rows] = await getConnection().execute(
    `SELECT ${EQUIPMENT_COLUMNS} FROM equipment WHERE UPPER(code) = UPPER(?) LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function create(data) {
  const [result] = await getConnection().execute(
    `INSERT INTO equipment (room_id, code, name, description, status)
     VALUES (?, ?, ?, ?, ?)`,
    [data.roomId, data.code, data.name, data.description || '', data.status || 'operational']
  );
  return findById(result.insertId);
}

async function update(id, patch) {
  const current = await findById(id);
  if (!current) return null;
  const columns = { roomId: 'room_id', code: 'code', name: 'name', description: 'description', status: 'status' };
  const entries = Object.entries(patch).filter(([key]) => columns[key]);
  if (!entries.length) return findById(id);
  const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(', ');
  const [result] = await getConnection().execute(
    `UPDATE equipment SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...entries.map(([, value]) => value), id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await getConnection().execute('DELETE FROM equipment WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByCode, create, update, remove };
