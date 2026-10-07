const { getConnection } = require('../config/database');
const { generateId } = require('../utils/generateId');

const REPORT_COLUMNS = `
  r.id, r.room_id AS roomId, rooms.name AS roomName, rooms.code AS roomCode,
  r.equipment_id AS equipmentId, equipment.name AS equipmentName, equipment.code AS equipmentCode,
  r.reported_by AS reportedBy, users.name AS reporterName, r.issue_type AS issueType,
  r.severity, r.description, r.status, r.resolution_notes AS resolutionNotes,
  r.resolved_at AS resolvedAt, r.created_at AS createdAt, r.updated_at AS updatedAt
`;
const REPORT_FROM = `FROM laboratory_reports r
  JOIN rooms ON rooms.id = r.room_id
  LEFT JOIN equipment ON equipment.id = r.equipment_id
  JOIN users ON users.id = r.reported_by`;

async function findAll({ reportedBy } = {}) {
  const where = reportedBy ? ' WHERE r.reported_by = ?' : '';
  const [rows] = await getConnection().execute(
    `SELECT ${REPORT_COLUMNS} ${REPORT_FROM}${where} ORDER BY r.created_at DESC`,
    reportedBy ? [reportedBy] : []
  );
  return rows;
}

async function findById(id) {
  const [rows] = await getConnection().execute(
    `SELECT ${REPORT_COLUMNS} ${REPORT_FROM} WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const id = generateId('report');
  await getConnection().execute(
    `INSERT INTO laboratory_reports
      (id, room_id, equipment_id, reported_by, issue_type, severity, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'reported')`,
    [id, data.roomId, data.equipmentId || null, data.reportedBy, data.issueType, data.severity, data.description]
  );
  return findById(id);
}

async function update(id, patch) {
  const [result] = await getConnection().execute(
    `UPDATE laboratory_reports
     SET status = ?, resolution_notes = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [patch.status, patch.resolutionNotes, patch.resolvedAt, id]
  );
  return result.affectedRows ? findById(id) : null;
}

module.exports = { findAll, findById, create, update };
