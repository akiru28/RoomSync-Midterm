const roomRepo = require('../repositories/roomRepository');
const { success, error, paginated } = require('../utils/response');
const { ROOM_TYPES } = require('../constants/roles');

const ROOM_TYPE_VALUES = Object.values(ROOM_TYPES);
const ROOM_PATCH_FIELDS = new Set([
  'name', 'code', 'type', 'capacity', 'location', 'features', 'description', 'isActive',
]);

function validateRoomPayload(payload, partial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Room details are required.';
  }

  const requiredFields = ['name', 'code', 'type', 'capacity'];
  if (!partial && requiredFields.some((field) => payload[field] === undefined || payload[field] === null || payload[field] === '')) {
    return 'name, code, type, and capacity are required.';
  }

  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 150) {
      return 'Room name must be between 2 and 150 characters.';
    }
  }
  if (payload.code !== undefined) {
    if (typeof payload.code !== 'string' || !payload.code.trim() || payload.code.trim().length > 50) {
      return 'Room code must be between 1 and 50 characters.';
    }
  }
  if (payload.type !== undefined && !ROOM_TYPE_VALUES.includes(payload.type)) {
    return `Room type must be one of: ${ROOM_TYPE_VALUES.join(', ')}.`;
  }
  if (payload.capacity !== undefined) {
    const capacity = Number(payload.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      return 'Room capacity must be a positive whole number.';
    }
  }
  if (payload.location !== undefined && (typeof payload.location !== 'string' || payload.location.length > 200)) {
    return 'Room location must be a string no longer than 200 characters.';
  }
  if (payload.description !== undefined && typeof payload.description !== 'string') {
    return 'Room description must be a string.';
  }
  if (payload.features !== undefined &&
      (!Array.isArray(payload.features) || payload.features.some((feature) => typeof feature !== 'string'))) {
    return 'Room features must be a list of strings.';
  }
  if (payload.isActive !== undefined && typeof payload.isActive !== 'boolean') {
    return 'Room availability must be true or false.';
  }
  if (partial && !Object.keys(payload).some((field) => ROOM_PATCH_FIELDS.has(field))) {
    return 'At least one valid room field is required.';
  }
  return null;
}

/**
 * GET /api/rooms
 * Query: type, minCapacity, search, page, perPage
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function list(req, res, next) {
  try {
    const q = req.query || {};
    const filters = {
      type: q.type || undefined,
      minCapacity: q.minCapacity ? Number(q.minCapacity) : undefined,
      search: q.search || undefined,
      activeOnly: true,
    };
    const all = await roomRepo.findAll(filters);
    const page = Number(q.page) || 1;
    const perPage = Number(q.perPage) || 20;
    if (q.page || q.perPage) {
      const start = (page - 1) * perPage;
      const items = all.slice(start, start + perPage);
      return paginated(res, items, all.length, page, perPage);
    }
    return success(res, all, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/rooms/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function get(req, res, next) {
  try {
    const room = await roomRepo.findById(req.params.id);
    if (!room) return error(res, 'Room not found.', 404);
    return success(res, room, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/rooms (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function create(req, res, next) {
  try {
    const body = req.body || {};
    const validationError = validateRoomPayload(body);
    if (validationError) return error(res, validationError, 400);
    const code = body.code.trim();
    const existing = await roomRepo.findByCode(code);
    if (existing) return error(res, 'Room code already exists.', 409);
    const room = await roomRepo.create({
      name: body.name.trim(),
      code,
      type: body.type,
      capacity: Number(body.capacity),
      location: body.location?.trim() || '',
      features: (body.features || []).map((feature) => feature.trim()).filter(Boolean),
      description: body.description?.trim() || '',
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    });
    return success(res, room, 'Room created.', 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/rooms/:id (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function update(req, res, next) {
  try {
    const body = req.body || {};
    const validationError = validateRoomPayload(body, true);
    if (validationError) return error(res, validationError, 400);
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => ROOM_PATCH_FIELDS.has(key)));
    if (patch.name !== undefined) patch.name = patch.name.trim();
    if (patch.code !== undefined) {
      patch.code = patch.code.trim();
      const existing = await roomRepo.findByCode(patch.code);
      if (existing && String(existing.id) !== String(req.params.id)) {
        return error(res, 'Room code already exists.', 409);
      }
    }
    if (patch.location !== undefined) patch.location = patch.location.trim();
    if (patch.description !== undefined) patch.description = patch.description.trim();
    if (patch.features !== undefined) patch.features = patch.features.map((feature) => feature.trim()).filter(Boolean);
    if (patch.capacity !== undefined) patch.capacity = Number(patch.capacity);
    const patched = await roomRepo.update(req.params.id, patch);
    if (!patched) return error(res, 'Room not found.', 404);
    return success(res, patched, 'Room updated.');
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/rooms/:id (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function remove(req, res, next) {
  try {
    const removed = await roomRepo.remove(req.params.id);
    if (!removed) return error(res, 'Room not found.', 404);
    return success(res, null, 'Room removed.');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/rooms/:id/availability
 * Query: start, end
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function availability(req, res, next) {
  try {
    const { start, end } = req.query || {};
    const room = await roomRepo.findById(req.params.id);
    if (!room) return error(res, 'Room not found.', 404);
    const startDate = start == null ? new Date() : new Date(start);
    const endDate = end == null ? new Date(Date.now() + 7 * 86400 * 1000) : new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return error(res, 'A valid start and end time range is required.', 400);
    }
    const rooms = await roomRepo.findAvailable(
      startDate,
      endDate,
      req.params.id
    );
    return success(res, rooms, 'OK');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, get, create, update, remove, availability };
