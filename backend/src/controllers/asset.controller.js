const crypto = require('crypto');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const AssetHistory = require('../models/AssetHistory');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAndUploadQR } = require('../services/qr.service');
const { emitAssetCreated, emitAssetUpdated, emitDashboardRefresh } = require('../utils/socketEvents');

// Helper: generate sequential assetCode like AST-0001
const generateAssetCode = async () => {
  const count = await Asset.countDocuments();
  const padded = String(count + 1).padStart(4, '0');
  return `AST-${padded}`;
};

// Helper: generate random publicSlug (8-char hex)
const generatePublicSlug = () => {
  return crypto.randomBytes(4).toString('hex'); // e.g. "a3f7b2c1"
};

// POST /api/assets (admin only)
const createAsset = asyncHandler(async (req, res, next) => {
  const { name, category, location, condition, lastServiceDate, nextServiceDate } = req.body;

  if (!name || !category || !location || !condition) {
    return next(new ApiError(400, 'name, category, location, and condition are required', 'BAD_REQUEST'));
  }

  // Generate unique assetCode — retry on collision
  let assetCode;
  let attempts = 0;
  while (attempts < 5) {
    const candidate = await generateAssetCode();
    const existing = await Asset.findOne({ assetCode: candidate });
    if (!existing) { assetCode = candidate; break; }
    attempts++;
  }
  if (!assetCode) {
    return next(new ApiError(500, 'Failed to generate unique asset code', 'INTERNAL_ERROR'));
  }

  // Generate unique publicSlug
  let publicSlug;
  let slugAttempts = 0;
  while (slugAttempts < 5) {
    const candidate = generatePublicSlug();
    const existing = await Asset.findOne({ publicSlug: candidate });
    if (!existing) { publicSlug = candidate; break; }
    slugAttempts++;
  }
  if (!publicSlug) {
    return next(new ApiError(500, 'Failed to generate unique public slug', 'INTERNAL_ERROR'));
  }

  // Generate QR code
  const frontendDomain = process.env.FRONTEND_URL;
  if (!frontendDomain) {
    console.warn('⚠️ WARNING: FRONTEND_URL environment variable not set. QR codes will use localhost URL.');
    console.warn('⚠️ Set FRONTEND_URL in .env for production deployment (e.g., https://yourdomain.com)');
  }
  const publicUrl = `${frontendDomain || 'http://localhost:5173'}/public/asset/${publicSlug}`;
  let qrCodeUrl = '';
  try {
    qrCodeUrl = await generateAndUploadQR(publicUrl, assetCode);
  } catch (err) {
    // Non-fatal: asset is still created, QR can be re-generated
    console.error('QR generation/upload failed:', err.message);
  }

  const asset = await Asset.create({
    assetCode,
    name,
    category,
    location,
    condition,
    publicSlug,
    qrCodeUrl,
    lastServiceDate: lastServiceDate || null,
    nextServiceDate: nextServiceDate || null,
    createdBy: req.user._id,
  });

  // Write AssetHistory
  await AssetHistory.create({
    asset: asset._id,
    actor: req.user._id.toString(),
    action: 'Asset created',
    metadata: { assetCode, name, category, location, condition },
  });

  // Emit Socket.io event for real-time notification
  emitAssetCreated(asset);
  emitDashboardRefresh();

  res.status(201).json(new ApiResponse(201, asset, 'Asset created successfully'));
});

// GET /api/assets (auth required — admin + technician)
const getAssets = asyncHandler(async (req, res) => {
  const { search, status, category, location, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = new RegExp(category, 'i');
  if (location) filter.location = new RegExp(location, 'i');
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { assetCode: new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTechnician', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Asset.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(200, {
    assets,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  }, 'Assets retrieved successfully'));
});

// GET /api/assets/:id
const getAssetById = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('assignedTechnician', 'name email');

  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'NOT_FOUND'));
  }

  res.status(200).json(new ApiResponse(200, asset, 'Asset retrieved successfully'));
});

// PATCH /api/assets/:id (admin only)
const updateAsset = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'NOT_FOUND'));
  }

  // Block attempts to change immutable fields
  const blocked = ['assetCode', 'publicSlug', 'qrCodeUrl', 'createdBy'];
  for (const field of blocked) {
    if (req.body[field] !== undefined) {
      return next(new ApiError(400, `Field '${field}' cannot be changed after creation`, 'BAD_REQUEST'));
    }
  }

  const allowed = ['name', 'location', 'condition', 'status', 'assignedTechnician', 'lastServiceDate', 'nextServiceDate', 'category'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = await Asset.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email').populate('assignedTechnician', 'name email');

  // Write AssetHistory
  await AssetHistory.create({
    asset: asset._id,
    actor: req.user._id.toString(),
    action: 'Asset updated',
    metadata: { changes: updates },
  });

  // Emit Socket.io event for real-time notification
  emitAssetUpdated(updated);
  emitDashboardRefresh();

  res.status(200).json(new ApiResponse(200, updated, 'Asset updated successfully'));
});

// GET /api/assets/:id/qr
const getAssetQR = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findById(req.params.id).select('assetCode qrCodeUrl publicSlug');
  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'NOT_FOUND'));
  }

  const frontendDomain = process.env.FRONTEND_URL || 'http://localhost:5173';
  const publicUrl = `${frontendDomain}/public/asset/${asset.publicSlug}`;

  res.status(200).json(new ApiResponse(200, {
    qrCodeUrl: asset.qrCodeUrl,
    publicUrl,
    assetCode: asset.assetCode,
  }, 'QR data retrieved successfully'));
});

// GET /api/assets/:id/history
const getAssetHistory = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findById(req.params.id).select('_id');
  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'NOT_FOUND'));
  }

  const history = await AssetHistory.find({ asset: req.params.id })
    .sort({ timestamp: -1 })
    .limit(50);

  // Retrieve user names for actor IDs
  const userIds = history
    .map(h => h.actor)
    .filter(a => mongoose.Types.ObjectId.isValid(a));

  const uniqueUserIds = [...new Set(userIds)];
  const users = await User.find({ _id: { $in: uniqueUserIds } }).select('name email');
  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = user.name;
    return acc;
  }, {});

  const populatedHistory = history.map(h => {
    const obj = h.toObject();
    if (userMap[obj.actor]) {
      obj.actorName = userMap[obj.actor];
    } else {
      obj.actorName = obj.actor; // "Public" or other string identifiers
    }
    return obj;
  });

  res.status(200).json(new ApiResponse(200, populatedHistory, 'Asset history retrieved successfully'));
});

// DELETE /api/assets/:id (admin only)
const deleteAsset = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'NOT_FOUND'));
  }

  // Check if asset has active issues
  const Issue = require('../models/Issue');
  const activeIssues = await Issue.countDocuments({ 
    asset: req.params.id, 
    status: { $in: ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts'] }
  });

  if (activeIssues > 0) {
    return next(new ApiError(400, `Cannot delete asset with ${activeIssues} active issue(s)`, 'BAD_REQUEST'));
  }

  await Asset.findByIdAndDelete(req.params.id);
  
  // Also delete asset history
  await AssetHistory.deleteMany({ asset: req.params.id });

  emitDashboardRefresh();

  res.status(200).json(new ApiResponse(200, null, 'Asset deleted successfully'));
});

module.exports = {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetQR,
  getAssetHistory,
};
