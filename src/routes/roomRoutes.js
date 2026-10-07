const express = require('express');
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const equipmentController = require('../controllers/equipmentController');

const router = express.Router();

/**
 * GET /api/rooms
 */
router.get('/', roomController.list);

/**
 * GET /api/rooms/:id
 */
router.get('/:id', roomController.get);

/**
 * GET /api/rooms/:id/availability
 */
router.get('/:id/availability', roomController.availability);
router.get('/:id/equipment', equipmentController.list);

/**
 * POST /api/rooms (admin)
 */
router.post('/', authenticate, requireAdmin, roomController.create);

/**
 * PATCH /api/rooms/:id (admin)
 */
router.patch('/:id', authenticate, requireAdmin, roomController.update);

/**
 * DELETE /api/rooms/:id (admin)
 */
router.delete('/:id', authenticate, requireAdmin, roomController.remove);

module.exports = router;
