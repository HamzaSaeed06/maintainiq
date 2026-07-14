const express = require('express');
const { register, login, me, getTechnicians, deleteUser, toggleUserStatus } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes — rate limited: 5 req/min per IP (Redis-backed)
router.post('/login', authLimiter, login);

// Admin-only routes — also rate limited so brute-force/enumeration is blocked
router.post('/register', authLimiter, auth, requireRole('admin'), register);
router.get('/technicians', auth, requireRole('admin'), getTechnicians);
router.delete('/:id', auth, requireRole('admin'), deleteUser);
router.patch('/:id/toggle-status', auth, requireRole('admin'), toggleUserStatus);

// Auth required
router.get('/me', auth, me);

module.exports = router;
