const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, authController.me);

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, authController.logout);

module.exports = router;
