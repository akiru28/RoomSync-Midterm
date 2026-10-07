const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');
const reservationController = require('../controllers/reservationController');
const reservationRepo = require('../repositories/reservationRepository');
const userRepo = require('../repositories/userRepository');
const roomRepo = require('../repositories/roomRepository');
const reportController = require('../controllers/reportController');
const equipmentController = require('../controllers/equipmentController');
const { success, error } = require('../utils/response');

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/users
 */
router.get('/users', userController.listUsers);

/**
 * POST /api/admin/users
 */
router.post('/users', userController.createAdminUser);

/**
 * PATCH /api/admin/users/:id
 */
router.patch('/users/:id', userController.updateAdminUser);

/**
 * GET /api/admin/rooms
 */
router.get('/rooms', async (req, res, next) => {
  try {
    const list = await roomRepo.findAll({});
    return success(res, list, 'OK');
  } catch (err) {
    return next(err);
  }
});

router.get('/equipment', equipmentController.list);
router.post('/equipment', equipmentController.create);
router.patch('/equipment/:id', equipmentController.update);
router.delete('/equipment/:id', equipmentController.retire);

/**
 * GET /api/admin/reservations
 */
router.get('/reservations', async (req, res, next) => {
  try {
    const list = await reservationRepo.findAll(req.query || {});
    return success(res, list, 'OK');
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/admin/reservations
 */
router.post('/reservations', reservationController.createForAdmin);

/**
 * PATCH /api/admin/reservations/:id
 */
router.patch('/reservations/:id', reservationController.updateForAdmin);

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.user.id) === String(req.params.id)) {
      return error(res, 'You cannot delete your own Admin account.', 400);
    }
    const removed = await userRepo.remove(req.params.id);
    if (!removed) {
      return success(res, null, 'User not found.', 404);
    }
    return success(res, null, 'User removed.');
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/reports/utilization
 */
router.get('/reports/utilization', reportController.utilization);

/**
 * GET /api/admin/reports/by-status
 */
router.get('/reports/by-status', reportController.reservationsByStatus);

/**
 * GET /api/admin/reports/user-activity
 */
router.get('/reports/user-activity', reportController.userActivity);

/**
 * GET /api/admin/reports/export.csv
 */
router.get('/reports/export.csv', reportController.exportCsv);

module.exports = router;
