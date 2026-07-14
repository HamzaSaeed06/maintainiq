const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: [true, 'Linked issue is required'],
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Linked asset is required'],
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician who performed maintenance is required'],
  },
  inspectionNotes: {
    type: String,
    required: [true, 'Inspection notes are required'],
    trim: true,
  },
  workPerformed: {
    type: String,
    required: [true, 'Work performed notes are required'],
    trim: true,
  },
  partsUsed: [{
    type: String,
  }],
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative'],
  },
  evidenceUrls: [{
    type: String,
  }],
  finalCondition: {
    type: String,
    enum: ['Good', 'Fair', 'Poor'],
    required: [true, 'Final asset condition is required'],
  },
  startedAt: {
    type: Date,
    required: [true, 'Start date/time is required'],
  },
  completedAt: {
    type: Date,
    required: [true, 'Completion date/time is required'],
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
