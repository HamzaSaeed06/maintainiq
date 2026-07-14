const fs = require('fs');
const Asset = require('../models/Asset');
const Issue = require('../models/Issue');
const AssetHistory = require('../models/AssetHistory');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../config/cloudinary');
const { analyzeComplaintWithAI } = require('../services/ai.service');
const { emitIssueCreated, emitDashboardRefresh } = require('../utils/socketEvents');

// Helper: generate sequential issueNumber like ISS-0001
const generateIssueNumber = async () => {
  const count = await Issue.countDocuments();
  const padded = String(count + 1).padStart(4, '0');
  return `ISS-${padded}`;
};

// GET /api/public/assets/:slug
const getPublicAssetBySlug = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findOne({ publicSlug: req.params.slug });
  if (!asset) {
    return next(new ApiError(404, 'Asset not found. Please verify the URL or QR code.', 'ASSET_NOT_FOUND'));
  }

  // Fetch last 3 history logs for safe recent-activity summary
  const history = await AssetHistory.find({ asset: asset._id })
    .sort({ timestamp: -1 })
    .limit(3);

  // Map to extremely safe, anonymous activity list
  const recentActivity = history.map(h => ({
    action: h.action,
    timestamp: h.timestamp,
  }));

  // Expose ONLY safe fields as per spec
  const safeAsset = {
    name: asset.name,
    assetCode: asset.assetCode,
    category: asset.category,
    location: asset.location,
    condition: asset.condition,
    status: asset.status,
    lastServiceDate: asset.lastServiceDate,
    nextServiceDate: asset.nextServiceDate,
    recentActivity,
  };

  res.status(200).json(new ApiResponse(200, safeAsset, 'Public asset details retrieved successfully'));
});

// POST /api/public/assets/:slug/issues
const reportIssueForAsset = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findOne({ publicSlug: req.params.slug });
  if (!asset) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return next(new ApiError(404, 'Asset not found. Cannot submit issue.', 'ASSET_NOT_FOUND'));
  }

  const { title, description, reporterName, reporterContact, category, priority } = req.body;

  if (!title || !description || !reporterName) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return next(new ApiError(400, 'title, description, and reporterName are required', 'BAD_REQUEST'));
  }

  // Upload evidence to Cloudinary if provided
  const evidenceUrls = [];
  if (req.file) {
    try {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'maintainiq/issues',
      });
      evidenceUrls.push(uploadResult.secure_url);
    } catch (uploadErr) {
      console.error('Evidence upload failed:', uploadErr.message);
    } finally {
      // Clean up local temp file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
  }

  // Generate unique issueNumber
  let issueNumber;
  let attempts = 0;
  while (attempts < 5) {
    const candidate = await generateIssueNumber();
    const existing = await Issue.findOne({ issueNumber: candidate });
    if (!existing) { issueNumber = candidate; break; }
    attempts++;
  }
  if (!issueNumber) {
    return next(new ApiError(500, 'Failed to generate unique issue number', 'INTERNAL_ERROR'));
  }

  // Create issue
  let aiSuggestion = null;
  if (req.body.aiSuggestion) {
    try {
      aiSuggestion = typeof req.body.aiSuggestion === 'string'
        ? JSON.parse(req.body.aiSuggestion)
        : req.body.aiSuggestion;
    } catch (err) {
      console.error('Failed to parse aiSuggestion from public issue reporting:', err.message);
    }
  }

  const issue = await Issue.create({
    issueNumber,
    asset: asset._id,
    title,
    description,
    category: category || asset.category || 'General',
    priority: priority || 'Medium',
    reporterName,
    reporterContact: reporterContact || '',
    evidenceUrls,
    status: 'Reported',
    aiSuggestion,
  });

  // Update Asset status to 'Issue Reported'
  asset.status = 'Issue Reported';
  await asset.save();

  // Write AssetHistory entry (actor = "Public")
  await AssetHistory.create({
    asset: asset._id,
    actor: 'Public',
    action: 'Issue reported publicly',
    relatedIssue: issue._id,
    metadata: {
      issueNumber,
      title,
    },
  });

  // Emit Socket.io event for real-time notification
  emitIssueCreated(issue);
  emitDashboardRefresh();

  res.status(201).json(new ApiResponse(201, issue, 'Issue reported successfully'));
});

// GET /api/public/issues/:issueNumber
const getPublicIssueStatus = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findOne({ issueNumber: req.params.issueNumber.toUpperCase() })
    .select('issueNumber title status createdAt updatedAt')
    .populate('asset', 'name assetCode');

  if (!issue) {
    return next(new ApiError(404, 'Issue number not found', 'NOT_FOUND'));
  }

  res.status(200).json(new ApiResponse(200, issue, 'Issue status retrieved successfully'));
});

// POST /api/public/assets/:slug/ai-triage
const publicTriageAsset = asyncHandler(async (req, res, next) => {
  const asset = await Asset.findOne({ publicSlug: req.params.slug });
  if (!asset) {
    return next(new ApiError(404, 'Asset not found', 'ASSET_NOT_FOUND'));
  }

  const { complaint } = req.body;
  if (!complaint) {
    return next(new ApiError(400, 'complaint is required', 'BAD_REQUEST'));
  }

  // Fetch recent history logs for context
  const history = await AssetHistory.find({ asset: asset._id })
    .sort({ timestamp: -1 })
    .limit(3);
  const recentActivity = history.map(h => h.action);

  const assetContext = {
    name: asset.name,
    category: asset.category,
    location: asset.location,
    condition: asset.condition,
    status: asset.status,
    recentActivity,
  };

  try {
    const suggestion = await analyzeComplaintWithAI(assetContext, complaint);
    res.status(200).json(new ApiResponse(200, suggestion, 'AI triage suggestion generated successfully'));
  } catch (err) {
    return next(new ApiError(500, err.message || 'AI Triage service failed', 'AI_TRIAGE_FAILED'));
  }
});

module.exports = {
  getPublicAssetBySlug,
  reportIssueForAsset,
  getPublicIssueStatus,
  publicTriageAsset,
};
