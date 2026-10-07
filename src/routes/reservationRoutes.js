const express = require('express');
const reservationController = require('../controllers/reservationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireCanReserve } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * GET /api/reservations
 */
router.get('/', authenticate, reservationController.list);

/**
 * GET /api/reservations/schedule
 * Approved schedule entries only; personal request details are not exposed.
 */
router.get('/schedule', authenticate, reservationController.schedule);

/**
 * POST /api/reservations
 * Role: Instructor only.
 */
router.post('/', authenticate, requireCanReserve, reservationController.create);

/**
 * GET /api/reservations/:id
 */
router.get('/:id', authenticate, reservationController.get);

/**
 * PATCH /api/reservations/:id/status
 * Fine-grained role + owner authorization handled inside reservationService.updateStatus.
 *   - Owner may cancel their own reservation.
 *   - Admin may approve, reject, cancel, or complete reservations.
 *   - Lab Tech cannot create, approve, reject, or cancel reservations.
 */
router.patch('/:id/status', authenticate, reservationController.updateStatus);

module.exports = router;
