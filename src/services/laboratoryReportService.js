const equipmentRepo = require('../repositories/equipmentRepository');
const reportRepo = require('../repositories/laboratoryReportRepository');
const roomRepo = require('../repositories/roomRepository');
const { ROLES } = require('../constants/roles');

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['reported', 'under_review', 'in_progress', 'resolved'];

function makeError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function create(payload, actor) {
  if (!actor || actor.role !== ROLES.LAB_TECH) {
    throw makeError('Only Lab Tech may submit laboratory reports.', 403);
  }
  const roomId = Number(payload.roomId);
  const issueType = typeof payload.issueType === 'string' ? payload.issueType.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const severity = payload.severity || 'medium';
  if (!Number.isInteger(roomId) || roomId < 1) throw makeError('A valid laboratory is required.', 400);
  if (!issueType || issueType.length > 100) throw makeError('Issue type must be between 1 and 100 characters.', 400);
  if (!description || description.length > 10000) throw makeError('Description must be between 1 and 10000 characters.', 400);
  if (!SEVERITIES.includes(severity)) throw makeError('Severity must be low, medium, high, or critical.', 400);

  const room = await roomRepo.findById(roomId);
  if (!room || room.type !== 'lab') throw makeError('Laboratory not found.', 404);
  if (room.isActive === false || room.isActive === 0) {
    throw makeError('Reports cannot be filed against an inactive laboratory.', 400);
  }

  let equipmentId = null;
  if (payload.equipmentId !== undefined && payload.equipmentId !== null && payload.equipmentId !== '') {
    equipmentId = Number(payload.equipmentId);
    if (!Number.isInteger(equipmentId) || equipmentId < 1) throw makeError('A valid equipment item is required.', 400);
    const equipment = await equipmentRepo.findById(equipmentId);
    if (!equipment || Number(equipment.roomId) !== roomId) {
      throw makeError('The selected equipment does not belong to this laboratory.', 400);
    }
  }
  return reportRepo.create({
    roomId,
    equipmentId,
    reportedBy: actor.id,
    issueType,
    severity,
    description,
  });
}

async function list(actor) {
  if (!actor) throw makeError('Authentication required.', 401);
  if (actor.role === ROLES.ADMIN) return reportRepo.findAll();
  if (actor.role === ROLES.LAB_TECH) return reportRepo.findAll({ reportedBy: actor.id });
  throw makeError('Forbidden: insufficient role.', 403);
}

async function get(id, actor) {
  const report = await reportRepo.findById(id);
  if (!report) throw makeError('Report not found.', 404);
  if (actor.role !== ROLES.ADMIN && (actor.role !== ROLES.LAB_TECH || String(report.reportedBy) !== String(actor.id))) {
    throw makeError('Forbidden: you cannot view this report.', 403);
  }
  return report;
}

async function update(id, payload, actor) {
  if (!actor || actor.role !== ROLES.ADMIN) throw makeError('Only Admin may manage reports.', 403);
  const current = await reportRepo.findById(id);
  if (!current) throw makeError('Report not found.', 404);
  const status = payload.status;
  const resolutionNotes = payload.resolutionNotes === undefined
    ? current.resolutionNotes || ''
    : payload.resolutionNotes;
  if (!STATUSES.includes(status)) throw makeError(`Status must be one of: ${STATUSES.join(', ')}.`, 400);
  if (!['reported', 'under_review', 'in_progress', 'resolved'].includes(current.status)) {
    throw makeError('This report can no longer be updated.', 400);
  }
  if (typeof resolutionNotes !== 'string' || resolutionNotes.length > 10000) {
    throw makeError('Resolution notes must be a string no longer than 10000 characters.', 400);
  }
  if (status === 'resolved' && !resolutionNotes.trim()) {
    throw makeError('Resolution notes are required when resolving a report.', 400);
  }
  const allowed = {
    reported: ['reported', 'under_review', 'in_progress', 'resolved'],
    under_review: ['under_review', 'in_progress', 'resolved'],
    in_progress: ['in_progress', 'resolved'],
    resolved: ['resolved'],
  };
  if (!allowed[current.status].includes(status)) {
    throw makeError(`Cannot transition from ${current.status} to ${status}.`, 400);
  }
  return reportRepo.update(id, {
    status,
    resolutionNotes: resolutionNotes.trim() || null,
    resolvedAt: status === 'resolved' ? (current.resolvedAt || new Date()) : null,
  });
}

module.exports = { create, list, get, update };
