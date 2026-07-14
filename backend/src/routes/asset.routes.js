const express = require('express');
const {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetQR,
  getAssetHistory,
} = require('../controllers/asset.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// All asset routes require authentication
router.use(auth);

// Read routes — admin and technician
router.get('/', getAssets);
router.get('/:id', getAssetById);
router.get('/:id/qr', getAssetQR);
router.get('/:id/history', getAssetHistory);

// Write routes — admin only
router.post('/', requireRole('admin'), createAsset);
router.patch('/:id', requireRole('admin'), updateAsset);
router.delete('/:id', requireRole('admin'), deleteAsset);

module.exports = router;
