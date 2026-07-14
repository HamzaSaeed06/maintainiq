const express = require('express');
const { getDashboardStats } = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Require authentication for all dashboard routes
router.use(auth);

router.get('/stats', getDashboardStats);

module.exports = router;
