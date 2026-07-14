const express = require('express');
const {
  getPublicAssetBySlug,
  reportIssueForAsset,
  getPublicIssueStatus,
  publicTriageAsset,
} = require('../controllers/public.controller');
const { publicGetLimiter, publicPostIssueLimiter, aiTriageLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/public/assets/:slug — anonymous view, 30 req/15 min per IP
router.get('/assets/:slug', publicGetLimiter, getPublicAssetBySlug);

// POST /api/public/assets/:slug/issues — 10 req/min per IP (Redis-backed)
router.post('/assets/:slug/issues', publicPostIssueLimiter, upload.single('evidence'), reportIssueForAsset);

// POST /api/public/assets/:slug/ai-triage — 5 req/min per IP (Redis-backed, separate limiter)
router.post('/assets/:slug/ai-triage', aiTriageLimiter, publicTriageAsset);

// GET /api/public/issues/:issueNumber — check issue status
router.get('/issues/:issueNumber', publicGetLimiter, getPublicIssueStatus);

module.exports = router;

