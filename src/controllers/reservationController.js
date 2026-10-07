const reservationService = require('../services/reservationService');
const { success, error, paginated } = require('../utils/response');

/**
 * GET /api/reservations
 * Query: roomId, userId, status, start, end, page, perPage
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function list(req, res, next) {
  try {
    const q = req.query || {};
    const filters = {
      roomId: q.roomId != null ? (Number(q.roomId) || q.roomId) : undefined,
      userId: q.userId || undefined,
      status: q.status || undefined,
      start: q.start || undefined,
      end: q.end || undefined,
    };
    const all = await reservationService.list(filters, req.user);
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

async function schedule(req, res, next) {
  try {
    const entries = await reservationService.schedule(req.query || {});
    return success(res, entries, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/reservations/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function get(req, res, next) {
  try {
    const reservation = await reservationService.get(req.params.id, req.user);
    return success(res, reservation, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/reservations
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function create(req, res, next) {
  try {
    const reservation = await reservationService.create(req.body || {}, req.user);
    return success(res, reservation, 'Reservation request submitted.', 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/reservations
 */
async function createForAdmin(req, res, next) {
  try {
    const reservation = await reservationService.createForAdmin(req.body || {}, req.user);
    return success(res, reservation, 'Reservation created and submitted for approval.', 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/reservations/:id
 */
async function updateForAdmin(req, res, next) {
  try {
    const reservation = await reservationService.updateForAdmin(req.params.id, req.body || {}, req.user);
    return success(res, reservation, 'Reservation updated.');
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/reservations/:id/status
 * Body: { status }
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    const updated = await reservationService.updateStatus(req.params.id, status, req.user);
    return success(res, updated, 'Reservation status updated.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, schedule, get, create, createForAdmin, updateForAdmin, updateStatus };
