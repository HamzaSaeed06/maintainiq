const mongoose = require('mongoose');

const aiSuggestionSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  category: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  possibleCauses: [{ type: String }],
  initialChecks: [{ type: String }],
  recurringWarning: { type: String, default: null },
  wasEdited: { type: Boolean, default: false }
}, { _id: false });

const issueSchema = new mongoose.Schema({
  issueNumber: {
    type: String,
    required: [true, 'Issue number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Linked asset is required'],
  },
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Issue category is required'],
    trim: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: [true, 'Priority is required'],
  },
  status: {
    type: String,
    enum: [
      'Reported',
      'Assigned',
      'Inspection Started',
      'Maintenance In Progress',
      'Waiting for Parts',
      'Resolved',
      'Closed',
      'Reopened'
    ],
    default: 'Reported',
  },
  reporterName: {
    type: String,
    required: [true, 'Reporter name is required'],
    trim: true,
  },
  reporterContact: {
    type: String,
    trim: true,
    default: '',
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  aiSuggestion: {
    type: aiSuggestionSchema,
    default: null,
  },
  evidenceUrls: [{
    type: String,
  }],
  resolvedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Issue', issueSchema);
