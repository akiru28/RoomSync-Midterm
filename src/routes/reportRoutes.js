const express = require('express');
const reportController = require('../controllers/laboratoryReportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole, requireAdmin } = require('../middleware/roleMiddleware');
const { CAN_REPORT_ROLES, ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate, requireRole(CAN_REPORT_ROLES));
router.get('/', reportController.list);
router.post('/', requireRole(ROLES.LAB_TECH), reportController.create);
router.get('/:id', reportController.get);
router.patch('/:id', requireAdmin, reportController.update);

module.exports = router;
