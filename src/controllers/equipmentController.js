const equipmentRepo = require('../repositories/equipmentRepository');
const roomRepo = require('../repositories/roomRepository');
const { success, error } = require('../utils/response');

const EQUIPMENT_STATUSES = ['operational', 'maintenance', 'retired'];

async function validate(payload, current = {}) {
  const roomId = Number(payload.roomId ?? current.roomId);
  const code = payload.code === undefined ? current.code : payload.code;
  const name = payload.name === undefined ? current.name : payload.name;
  const description = payload.description === undefined ? current.description || '' : payload.description;
  const status = payload.status === undefined ? current.status || 'operational' : payload.status;
  if (!Number.isInteger(roomId) || roomId < 1) return { error: 'A valid laboratory is required.' };
  const room = await roomRepo.findById(roomId);
  if (!room || room.type !== 'lab') return { error: 'Laboratory not found.' };
  if (typeof code !== 'string' || !code.trim() || code.trim().length > 50) {
    return { error: 'Equipment code must be between 1 and 50 characters.' };
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
    return { error: 'Equipment name must be between 1 and 150 characters.' };
  }
  if (typeof description !== 'string' || description.length > 10000) {
    return { error: 'Description must be a string no longer than 10000 characters.' };
  }
  if (!EQUIPMENT_STATUSES.includes(status)) return { error: 'Invalid equipment status.' };
  return { value: { roomId, code: code.trim(), name: name.trim(), description: description.trim(), status } };
}

async function list(req, res, next) {
  try {
    const items = await equipmentRepo.findAll({
      roomId: req.params.id ? Number(req.params.id) : (req.query.roomId ? Number(req.query.roomId) : undefined),
      includeRetired: req.baseUrl.endsWith('/admin'),
    });
    return success(res, items, 'OK');
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { error: validationError, value } = await validate(req.body || {});
    if (validationError) return error(res, validationError, 400);
    if (await equipmentRepo.findByCode(value.code)) return error(res, 'Equipment code already exists.', 409);
    const item = await equipmentRepo.create(value);
    return success(res, item, 'Equipment created.', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const current = await equipmentRepo.findById(req.params.id);
    if (!current) return error(res, 'Equipment not found.', 404);
    const { error: validationError, value } = await validate(req.body || {}, current);
    if (validationError) return error(res, validationError, 400);
    const existing = await equipmentRepo.findByCode(value.code);
    if (existing && String(existing.id) !== String(req.params.id)) {
      return error(res, 'Equipment code already exists.', 409);
    }
    const item = await equipmentRepo.update(req.params.id, value);
    return success(res, item, 'Equipment updated.');
  } catch (err) {
    return next(err);
  }
}

async function retire(req, res, next) {
  try {
    const current = await equipmentRepo.findById(req.params.id);
    if (!current) return error(res, 'Equipment not found.', 404);
    const item = await equipmentRepo.update(req.params.id, { status: 'retired' });
    return success(res, item, 'Equipment retired.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, update, retire };
