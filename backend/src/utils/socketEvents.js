// Socket.io event emitter helper - MaintainIQ

/**
 * Emit event when a new issue is created
 * @param {Object} issue - The created issue object
 */
const emitIssueCreated = (issue) => {
  if (global.io) {
    // Notify admin room
    global.io.to('admin').emit('issue:created', issue);
    
    // If assigned to a technician, notify them
    if (issue.assignedTechnician) {
      global.io.to(`technician_${issue.assignedTechnician}`).emit('issue:created', issue);
    }
  }
};

/**
 * Emit event when an issue is assigned to a technician
 * @param {Object} issue - The updated issue object
 * @param {String} technicianId - The technician's ID
 */
const emitIssueAssigned = (issue, technicianId) => {
  if (global.io) {
    console.log('[Socket Events] Emitting issue:assigned to technician:', technicianId);
    
    // Notify the specific technician
    const technicianRoom = `technician_${technicianId}`;
    global.io.to(technicianRoom).emit('issue:assigned', issue);
    console.log('[Socket Events] Sent to room:', technicianRoom);
    
    // Also emit to admin room
    global.io.to('admin').emit('issue:assigned', issue);
    console.log('[Socket Events] Sent to room: admin');
  } else {
    console.error('[Socket Events] global.io not available');
  }
};

/**
 * Emit event when issue status is updated
 * @param {Object} issue - The updated issue object
 */
const emitIssueStatusUpdated = (issue) => {
  if (global.io) {
    // Notify admin room
    global.io.to('admin').emit('issue:status_updated', issue);
    
    // Notify assigned technician
    if (issue.assignedTechnician) {
      global.io.to(`technician_${issue.assignedTechnician}`).emit('issue:status_updated', issue);
    }
  }
};

/**
 * Emit event when maintenance log is added
 * @param {Object} issue - The updated issue object
 * @param {Object} log - The maintenance log object
 */
const emitMaintenanceLogged = (issue, log) => {
  if (global.io) {
    // Notify admin room
    global.io.to('admin').emit('maintenance:logged', { issue, log });
    
    // Notify assigned technician
    if (issue.assignedTechnician) {
      global.io.to(`technician_${issue.assignedTechnician}`).emit('maintenance:logged', { issue, log });
    }
  }
};

/**
 * Emit event when issue is resolved
 * @param {Object} issue - The resolved issue object
 * @param {Object} asset - The updated asset object
 */
const emitIssueResolved = (issue, asset) => {
  if (global.io) {
    // Notify admin room
    global.io.to('admin').emit('issue:resolved', { issue, asset });
    
    // Notify assigned technician
    if (issue.assignedTechnician) {
      global.io.to(`technician_${issue.assignedTechnician}`).emit('issue:resolved', { issue, asset });
    }
  }
};

/**
 * Emit event when asset is created
 * @param {Object} asset - The created asset object
 */
const emitAssetCreated = (asset) => {
  if (global.io) {
    global.io.to('admin').emit('asset:created', asset);
  }
};

/**
 * Emit event when asset is updated
 * @param {Object} asset - The updated asset object
 */
const emitAssetUpdated = (asset) => {
  if (global.io) {
    global.io.to('admin').emit('asset:updated', asset);
  }
};

/**
 * Emit event when dashboard stats need refresh
 */
const emitDashboardRefresh = () => {
  if (global.io) {
    global.io.to('admin').emit('dashboard:refresh');
  }
};

module.exports = {
  emitIssueCreated,
  emitIssueAssigned,
  emitIssueStatusUpdated,
  emitMaintenanceLogged,
  emitIssueResolved,
  emitAssetCreated,
  emitAssetUpdated,
  emitDashboardRefresh,
};
