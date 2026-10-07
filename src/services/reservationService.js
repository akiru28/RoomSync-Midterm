const reservationRepo = require('../repositories/reservationRepository');
const roomRepo = require('../repositories/roomRepository');
const userRepo = require('../repositories/userRepository');
const {
  createReservation: validateCreate,
  updateStatus: validateStatus,
} = require('../validators/reservationValidator');
const notificationService = require('./notificationService');
const {
  RESERVATION_STATUSES,
  ROLES,
  CAN_APPROVE_ROLES,
  CAN_RESERVE_ROLES,
} = require('../constants/roles');
const { sanitize } = require('../models/User');

const STATUS_TRANSITIONS = {
  [RESERVATION_STATUSES.PENDING]: [
    RESERVATION_STATUSES.APPROVED,
    RESERVATION_STATUSES.REJECTED,
    RESERVATION_STATUSES.CANCELLED,
  ],
  [RESERVATION_STATUSES.APPROVED]: [
    RESERVATION_STATUSES.CANCELLED,
    RESERVATION_STATUSES.REJECTED,
    RESERVATION_STATUSES.COMPLETED,
  ],
  [RESERVATION_STATUSES.REJECTED]: [],
  [RESERVATION_STATUSES.CANCELLED]: [],
  [RESERVATION_STATUSES.COMPLETED]: [],
};

function requireAvailableReservation(result) {
  if (result.conflicts.length) {
    const err = new Error('Room is already reserved in that time range.');
    err.status = 409;
    err.meta = { conflicts: result.conflicts };
    throw err;
  }
  if (!result.reservation) {
    const err = new Error('Room or reservation was not found.');
    err.status = 404;
    throw err;
  }
  return result.reservation;
}

/**
 * Create a new reservation request.
 * @param {object} payload
 * @param {object} actor - Authenticated user creating the reservation
 * @returns {Promise<object>} Created reservation
 */
async function create(payload, actor) {
  const validationError = validateCreate(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.status = 400;
    throw err;
  }

  const roomId = Number(payload.roomId ?? payload.room_id);
  const room = await roomRepo.findById(roomId);
  if (!room) {
    const err = new Error('Room not found.');
    err.status = 404;
    throw err;
  }
  if (room.isActive === false || room.isActive === 0) {
    const err = new Error('Room is not available for reservation.');
    err.status = 400;
    throw err;
  }

  const attendees = Number(payload.attendees ?? 1);
  if (attendees > room.capacity) {
    const err = new Error(`Attendees exceeds room capacity of ${room.capacity}.`);
    err.status = 400;
    throw err;
  }

  const startDate = new Date(payload.startDate ?? payload.start_time).toISOString();
  const endDate = new Date(payload.endDate ?? payload.end_time).toISOString();

  if (!actor || !CAN_RESERVE_ROLES.includes(actor.role)) {
    const err = new Error('Forbidden: your role is not permitted to create reservations.');
    err.status = 403;
    throw err;
  }

  // Every reservation is submitted by an Instructor and must be reviewed by Admin.
  const defaultStatus = RESERVATION_STATUSES.PENDING;

  const reservationResult = await reservationRepo.createIfAvailable({
    roomId,
    roomName: room.name,
    userId: actor ? actor.id : (payload.userId || 'guest'),
    userName: actor ? actor.name : (payload.userName || payload.user || 'Guest'),
    purpose: String(payload.purpose).trim(),
    programSection: String(payload.programSection).trim(),
    startDate,
    endDate,
    attendees,
    notes: payload.notes || '',
    status: defaultStatus,
  });
  const reservation = requireAvailableReservation(reservationResult);

  await notificationService.onReservationCreated(reservation);
  return reservation;
}

/**
 * Update reservation status with state transition rules.
 * @param {string} id
 * @param {string} status
 * @param {object} actor
 * @returns {Promise<object>}
 */
async function updateStatus(id, status, actor) {
  const statusError = validateStatus(status);
  if (statusError) {
    const err = new Error(statusError);
    err.status = 400;
    throw err;
  }

  const reservation = await reservationRepo.findById(id);
  if (!reservation) {
    const err = new Error('Reservation not found.');
    err.status = 404;
    throw err;
  }

  const prevStatus = reservation.status;
  const next = String(status).toLowerCase();
  if (prevStatus === next) return reservation;

  const allowed = STATUS_TRANSITIONS[prevStatus] || [];
  if (!allowed.includes(next)) {
    const err = new Error(`Cannot transition from ${prevStatus} to ${next}.`);
    err.status = 400;
    throw err;
  }

  const isOwner = actor && String(reservation.userId) === String(actor.id);
  const isAdmin = actor && CAN_APPROVE_ROLES.includes(actor.role);
  if (next === RESERVATION_STATUSES.CANCELLED) {
    if (!isOwner && !isAdmin) {
      const err = new Error('Only the reservation owner or Admin may cancel.');
      err.status = 403;
      throw err;
    }
  } else if (!isAdmin) {
    const err = new Error('Forbidden: only Admin may approve or reject reservations.');
    err.status = 403;
    throw err;
  }

  const updated = await reservationRepo.updateStatus(id, next, actor ? actor.id : undefined);
  await notificationService.onStatusChanged(updated, prevStatus, sanitize(actor));
  return updated;
}

/**
 * List reservations with role-based filters.
 * Students see only their own reservations.
 * @param {object} filters
 * @param {object} actor
 * @returns {Promise<Array>}
 */
async function list(filters, actor) {
  const f = { ...(filters || {}) };

  // Admin can review all reservations. Instructor can see only their own.
  // Lab Tech and Student do not have reservation-list access.
  if (!actor) {
    const err = new Error('Authentication required.');
    err.status = 401;
    throw err;
  }

  if (actor.role === ROLES.ADMIN) {
    return reservationRepo.findAll(f);
  }

  if (actor.role === ROLES.INSTRUCTOR) {
    f.userId = actor.id;
    return reservationRepo.findAll(f);
  }

  return [];
}

async function schedule(filters) {
  const f = filters || {};
  return reservationRepo.findSchedule({
    roomId: f.roomId != null ? (Number(f.roomId) || f.roomId) : undefined,
    start: f.start || undefined,
    end: f.end || undefined,
  });
}

/**
 * Get a single reservation only for its Instructor owner or Admin.
 */
async function get(id, actor) {
  const reservation = await reservationRepo.findById(id);
  if (!reservation) {
    const err = new Error('Reservation not found.');
    err.status = 404;
    throw err;
  }

  const allowed = actor && (actor.role === ROLES.ADMIN ||
    (actor.role === ROLES.INSTRUCTOR && String(reservation.userId) === String(actor.id)));

  if (!allowed) {
    const err = new Error('Forbidden: you do not have access to this reservation.');
    err.status = 403;
    throw err;
  }

  return reservation;
}

function requireAdmin(actor) {
  if (!actor || actor.role !== ROLES.ADMIN) {
    const err = new Error('Forbidden: only Admin may manage reservations.');
    err.status = 403;
    throw err;
  }
}

async function validateAdminReservation(payload) {
  const validationError = validateCreate(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.status = 400;
    throw err;
  }
  if (String(payload.purpose).trim().length > 255) {
    const err = new Error('Reservation purpose must not exceed 255 characters.');
    err.status = 400;
    throw err;
  }
  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    const err = new Error('Reservation notes must be a string.');
    err.status = 400;
    throw err;
  }

  const roomId = Number(payload.roomId ?? payload.room_id);
  const room = await roomRepo.findById(roomId);
  if (!room) {
    const err = new Error('Room not found.');
    err.status = 404;
    throw err;
  }
  if (room.isActive === false || room.isActive === 0) {
    const err = new Error('Room is not available for reservation.');
    err.status = 400;
    throw err;
  }

  const userId = String(payload.userId || '').trim();
  if (!userId) {
    const err = new Error('An instructor must be selected for the reservation.');
    err.status = 400;
    throw err;
  }
  const user = await userRepo.findById(userId);
  if (!user || user.role !== ROLES.INSTRUCTOR) {
    const err = new Error('Reservation owner must be an existing instructor.');
    err.status = 400;
    throw err;
  }

  const attendees = Number(payload.attendees ?? 1);
  if (attendees > room.capacity) {
    const err = new Error(`Attendees exceeds room capacity of ${room.capacity}.`);
    err.status = 400;
    throw err;
  }

  const startDate = new Date(payload.startDate ?? payload.start_time).toISOString();
  const endDate = new Date(payload.endDate ?? payload.end_time).toISOString();
  return {
    roomId,
    userId,
    purpose: String(payload.purpose).trim(),
    programSection: String(payload.programSection).trim(),
    startDate,
    endDate,
    attendees,
    notes: typeof payload.notes === 'string' ? payload.notes.trim() : '',
  };
}

async function createForAdmin(payload, actor) {
  requireAdmin(actor);
  const data = await validateAdminReservation(payload);
  const reservation = requireAvailableReservation(await reservationRepo.createIfAvailable({
    ...data,
    status: RESERVATION_STATUSES.PENDING,
  }));
  await notificationService.onReservationCreated(reservation);
  return reservation;
}

async function updateForAdmin(id, payload, actor) {
  requireAdmin(actor);
  const current = await reservationRepo.findById(id);
  if (!current) {
    const err = new Error('Reservation not found.');
    err.status = 404;
    throw err;
  }
  if (![RESERVATION_STATUSES.PENDING, RESERVATION_STATUSES.APPROVED].includes(current.status)) {
    const err = new Error('Only pending or approved reservations can be edited.');
    err.status = 400;
    throw err;
  }

  const data = await validateAdminReservation(payload);
  const patch = { ...data };
  if (current.status === RESERVATION_STATUSES.APPROVED) {
    patch.status = RESERVATION_STATUSES.PENDING;
    patch.approvedBy = null;
    patch.approvedAt = null;
  }
  const updated = requireAvailableReservation(await reservationRepo.updateIfAvailable(id, patch));
  if (current.status !== updated.status) {
    await notificationService.onStatusChanged(updated, current.status, sanitize(actor));
  }
  return updated;
}

module.exports = { create, updateStatus, list, schedule, get, createForAdmin, updateForAdmin };
