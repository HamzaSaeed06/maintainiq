const fs = require('fs');
const Issue = require('../models/Issue');
const Asset = require('../models/Asset');
const MaintenanceLog = require('../models/MaintenanceLog');
const AssetHistory = require('../models/AssetHistory');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../config/cloudinary');
const { sendAssignmentEmail, sendResolutionEmail } = require('../services/email.service');
const {
  emitIssueAssigned,
  emitIssueStatusUpdated,
  emitMaintenanceLogged,
  emitIssueResolved,
} = require('../utils/socketEvents');

// Strict transition validator
const VALID_TRANSITIONS = {
  'Reported': ['Assigned'],
  'Assigned': ['Inspection Started'],
  'Inspection Started': ['Maintenance In Progress'],
  'Maintenance In Progress': ['Waiting for Parts', 'Resolved'],
  'Waiting for Parts': ['Maintenance In Progress', 'Resolved'],
  'Resolved': ['Closed', 'Reopened'],
  'Reopened': ['Assigned', 'Inspection Started', 'Maintenance In Progress'],
  'Closed': ['Reopened'],
};

// GET /api/issues
const getIssues = asyncHandler(async (req, res, next) => {
  const { status, priority, technician, asset, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) {
    if (status.includes(',')) {
      filter.status = { $in: status.split(',') };
    } else {
      filter.status = status;
    }
  }
  if (priority) filter.priority = priority;
  if (technician) filter.assignedTechnician = technician;
  if (asset) filter.asset = asset;

  if (search) {
    // Search issues by issueNumber or title (regex)
    filter.$or = [
      { issueNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
    ];
  }

  // Technicians can only view issues assigned to them
  if (req.user.role === 'technician') {
    filter.assignedTechnician = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort({ createdAt: -1 })
      .populate('asset', 'name assetCode')
      .populate('assignedTechnician', 'name email')
      .skip(skip)
      .limit(Number(limit)),
    Issue.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(200, {
    issues,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 },
  }, 'Issues retrieved successfully'));
});

// GET /api/issues/:id
const getIssueById = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id)
    .populate('asset', 'name assetCode category location condition status')
    .populate('assignedTechnician', 'name email');

  if (!issue) {
    return next(new ApiError(404, 'Issue not found', 'NOT_FOUND'));
  }

  // Technicians can only view issues assigned to them
  if (req.user.role === 'technician' && (!issue.assignedTechnician || String(issue.assignedTechnician._id) !== req.user.id)) {
    return next(new ApiError(403, 'Access denied. This issue is not assigned to you.', 'FORBIDDEN'));
  }

  // Also fetch maintenance logs for this issue
  const logs = await MaintenanceLog.find({ issue: issue._id })
    .sort({ createdAt: -1 })
    .populate('technician', 'name email');

  res.status(200).json(new ApiResponse(200, { issue, logs }, 'Issue details retrieved successfully'));
});

// PATCH /api/issues/:id/assign
const assignTechnician = asyncHandler(async (req, res, next) => {
  const { technicianId } = req.body;
  if (!technicianId) {
    return next(new ApiError(400, 'technicianId is required', 'BAD_REQUEST'));
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new ApiError(404, 'Issue not found', 'NOT_FOUND'));
  }

  const techUser = await User.findOne({ _id: technicianId, role: 'technician' });
  if (!techUser) {
    return next(new ApiError(400, 'Valid technician not found with the provided ID', 'TECHNICIAN_NOT_FOUND'));
  }

  const previousTechnician = issue.assignedTechnician;
  issue.assignedTechnician = technicianId;
  // Only move to 'Assigned' if the issue hasn't progressed beyond initial states
  if (issue.status === 'Reported' || issue.status === 'Reopened') {
    issue.status = 'Assigned';
  }
  await issue.save();

  console.log('[Issue Controller] Technician assigned:', {
    issueId: issue._id,
    technicianId: technicianId,
    technicianName: techUser.name,
    previousTechnician: previousTechnician,
    status: issue.status
  });

  const asset = await Asset.findById(issue.asset);
  if (asset) {
    await AssetHistory.create({
      asset: asset._id,
      actor: req.user._id,
      action: `Issue assigned to tech: ${techUser.name}`,
      relatedIssue: issue._id,
      metadata: { issueNumber: issue.issueNumber, technician: techUser.name },
    });

    // Trigger assignment notification email asynchronously
    if (techUser.email) {
      sendAssignmentEmail(
        techUser.email,
        techUser.name,
        issue.issueNumber,
        asset.name,
        asset.location,
        issue.priority
      ).catch(err => {
        console.error('⚠️ Failed to send assignment notification email:', err.message);
      });
    }
  }

  // Emit Socket.io events for real-time notification
  console.log('[Issue Controller] Emitting issue:assigned event');
  emitIssueAssigned(issue, technicianId);

  // Emit unassigned event to previous technician if there was one
  if (previousTechnician && previousTechnician !== technicianId) {
    console.log('[Issue Controller] Emitting issue:unassigned event to previous technician:', previousTechnician);
    if (global.io) {
      global.io.to(`technician_${previousTechnician}`).emit('issue:unassigned', issue);
      console.log('[Issue Controller] Sent to room: technician_' + previousTechnician);
    }
  }

  res.status(200).json(new ApiResponse(200, issue, 'Technician assigned successfully'));
});

// PATCH /api/issues/:id/unassign
const unassignTechnician = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new ApiError(404, 'Issue not found', 'NOT_FOUND'));
  }

  const previousTechnician = issue.assignedTechnician;
  issue.assignedTechnician = null;
  
  // Reset status to Reported if it was in early stages
  if (issue.status === 'Assigned' || issue.status === 'Inspection Started') {
    issue.status = 'Reported';
  }
  
  await issue.save();

  console.log('[Issue Controller] Technician unassigned:', {
    issueId: issue._id,
    previousTechnician: previousTechnician,
    status: issue.status
  });

  const asset = await Asset.findById(issue.asset);
  if (asset) {
    await AssetHistory.create({
      asset: asset._id,
      actor: req.user._id,
      action: 'Issue unassigned',
      relatedIssue: issue._id,
      metadata: { issueNumber: issue.issueNumber },
    });
  }

  // Emit Socket.io event for real-time notification
  console.log('[Issue Controller] Emitting issue:unassigned event');
  if (global.io) {
    // Notify the previous technician
    if (previousTechnician) {
      global.io.to(`technician_${previousTechnician}`).emit('issue:unassigned', issue);
      console.log('[Issue Controller] Sent to room: technician_' + previousTechnician);
    }
    // Notify admin room
    global.io.to('admin').emit('issue:unassigned', issue);
    console.log('[Issue Controller] Sent to room: admin');
  }

  res.status(200).json(new ApiResponse(200, issue, 'Technician unassigned successfully'));
});

// PATCH /api/issues/:id/status
const updateIssueStatus = asyncHandler(async (req, res, next) => {
  const { status, nextServiceDate } = req.body;
  if (!status) {
    return next(new ApiError(400, 'status is required', 'BAD_REQUEST'));
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new ApiError(404, 'Issue not found', 'NOT_FOUND'));
  }

  // Auth ownership check: Technician can only edit their assigned issues
  if (req.user.role === 'technician' && String(issue.assignedTechnician) !== req.user.id) {
    return next(new ApiError(403, 'You can only update details of issues assigned to you', 'FORBIDDEN'));
  }

  // Validate state machine transitions
  const currentStatus = issue.status;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(status)) {
    const msg = currentStatus === 'Closed'
      ? 'Closed issues cannot be edited — reopen the issue first'
      : `Forbidden status transition: cannot change from "${currentStatus}" to "${status}"`;
    return next(new ApiError(400, msg, 'INVALID_STATUS_TRANSITION'));
  }

  // === PRE-VALIDATION (all checks before any DB writes) ===

  // Rule: Cannot resolve without at least one maintenance log
  if (status === 'Resolved') {
    const logsCount = await MaintenanceLog.countDocuments({ issue: issue._id });
    if (logsCount === 0) {
      return next(new ApiError(400, 'Cannot resolve issue: at least one maintenance log must be recorded first', 'MAINTENANCE_LOG_REQUIRED'));
    }
  }

  // Rule: nextServiceDate cannot be before today when resolving
  let parsedNextDate = null;
  if (status === 'Resolved' && nextServiceDate) {
    parsedNextDate = new Date(nextServiceDate);
    if (isNaN(parsedNextDate.getTime())) {
      return next(new ApiError(400, 'nextServiceDate is not a valid date', 'BAD_REQUEST'));
    }
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    parsedNextDate.setHours(0, 0, 0, 0);
    if (parsedNextDate < todayMidnight) {
      return next(new ApiError(400, 'Next service date cannot be before the maintenance completion date', 'INVALID_NEXT_SERVICE_DATE'));
    }
  }

  // === WRITES (only after all validation passes) ===

  issue.status = status;
  if (status === 'Resolved') {
    issue.resolvedAt = new Date();
  }
  await issue.save();

  // Write AssetHistory entry for the issue status change
  const asset = await Asset.findById(issue.asset);
  if (asset) {
    await AssetHistory.create({
      asset: asset._id,
      actor: req.user._id,
      action: `Issue status changed from ${currentStatus} to ${status}`,
      relatedIssue: issue._id,
      metadata: { issueNumber: issue.issueNumber },
    });

    // Synchronize linked Asset status based on Issue progression
    if (status === 'Inspection Started') {
      asset.status = 'Under Inspection';
    } else if (status === 'Maintenance In Progress') {
      asset.status = 'Under Maintenance';
    } else if (status === 'Resolved') {
      // Critical priority issue → Out of Service, else → Operational
      asset.status = issue.priority === 'Critical' ? 'Out of Service' : 'Operational';
      asset.lastServiceDate = new Date();
      if (parsedNextDate) {
        asset.nextServiceDate = parsedNextDate;
      }

      // Trigger resolution notification email asynchronously to the public reporter
      if (issue.reporterContact && issue.reporterContact.includes('@')) {
        sendResolutionEmail(
          issue.reporterContact,
          issue.reporterName,
          issue.issueNumber,
          asset.name
        ).catch(err => {
          console.error('⚠️ Failed to send resolution notification email:', err.message);
        });
      }
    }
    await asset.save();
  }

  // Emit Socket.io event for real-time notification
  emitIssueStatusUpdated(issue);

  // If issue is resolved, emit specific resolved event
  if (status === 'Resolved') {
    emitIssueResolved(issue, asset);
  }

  res.status(200).json(new ApiResponse(200, issue, 'Status updated and asset synchronized successfully'));
});

// POST /api/issues/:id/maintenance-log
const createMaintenanceLog = asyncHandler(async (req, res, next) => {
  const { inspectionNotes, workPerformed, cost, finalCondition, startedAt, completedAt, partsUsed } = req.body;

  // Validate required inputs
  if (!inspectionNotes || !workPerformed || cost === undefined || !finalCondition || !startedAt || !completedAt) {
    return next(new ApiError(400, 'inspectionNotes, workPerformed, cost, finalCondition, startedAt, and completedAt are required', 'BAD_REQUEST'));
  }

  // Cost check (must be >= 0)
  const parsedCost = Number(cost);
  if (isNaN(parsedCost) || parsedCost < 0) {
    return next(new ApiError(400, 'Cost must be a positive number', 'BAD_REQUEST'));
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new ApiError(404, 'Issue not found', 'NOT_FOUND'));
  }

  // Authorization: Only assigned technician (or admin) can log maintenance
  if (req.user.role === 'technician' && String(issue.assignedTechnician) !== req.user.id) {
    return next(new ApiError(403, 'You can only log maintenance for issues assigned to you', 'FORBIDDEN'));
  }

  // Handle uploaded evidence files to Cloudinary
  const evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      try {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'maintainiq/maintenance-logs',
        });
        evidenceUrls.push(uploadResult.secure_url);
      } catch (err) {
        console.error('Evidence photo upload failed:', err.message);
      } finally {
        // Clean local temp file
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    }
  }

  const log = await MaintenanceLog.create({
    issue: issue._id,
    asset: issue.asset,
    technician: req.user._id,
    inspectionNotes,
    workPerformed,
    partsUsed: partsUsed ? (typeof partsUsed === 'string' ? JSON.parse(partsUsed) : partsUsed) : [],
    cost: parsedCost,
    evidenceUrls,
    finalCondition,
    startedAt: new Date(startedAt),
    completedAt: new Date(completedAt),
  });

  // Write AssetHistory entry for the maintenance action
  await AssetHistory.create({
    asset: issue.asset,
    actor: req.user._id,
    action: `Maintenance log added: ${workPerformed.slice(0, 40)}...`,
    relatedIssue: issue._id,
    metadata: {
      cost: parsedCost,
      condition: finalCondition,
    },
  });

  // Emit Socket.io event for real-time notification
  emitMaintenanceLogged(issue, log);

  res.status(201).json(new ApiResponse(201, log, 'Maintenance work logged successfully'));
});

module.exports = {
  getIssues,
  getIssueById,
  assignTechnician,
  unassignTechnician,
  updateIssueStatus,
  createMaintenanceLog,
};
