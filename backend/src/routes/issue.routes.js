const express = require('express');
const {
  getIssues,
  getIssueById,
  assignTechnician,
  unassignTechnician,
  updateIssueStatus,
  createMaintenanceLog,
} = require('../controllers/issue.controller');
const protect = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/issues — view filterable list
router.get('/', getIssues);

// GET /api/issues/:id — get single issue details
router.get('/:id', getIssueById);

// PATCH /api/issues/:id/assign — assign technician (admin only)
router.patch('/:id/assign', requireRole('admin'), assignTechnician);

// PATCH /api/issues/:id/unassign — unassign technician (admin only)
router.patch('/:id/unassign', requireRole('admin'), unassignTechnician);

// PATCH /api/issues/:id/status — update status (state machine)
router.patch('/:id/status', updateIssueStatus);

// POST /api/issues/:id/maintenance-log — add maintenance (evidence file array supported)
router.post('/:id/maintenance-log', upload.array('evidence', 5), createMaintenanceLog);

module.exports = router;
