const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetCode: {
    type: String,
    required: [true, 'Asset code is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  condition: {
    type: String,
    enum: ['Good', 'Fair', 'Poor'],
    required: [true, 'Condition is required'],
  },
  status: {
    type: String,
    enum: [
      'Operational',
      'Issue Reported',
      'Under Inspection',
      'Under Maintenance',
      'Out of Service',
      'Retired'
    ],
    default: 'Operational',
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lastServiceDate: {
    type: Date,
    default: null,
  },
  nextServiceDate: {
    type: Date,
    default: null,
  },
  qrCodeUrl: {
    type: String,
    default: '',
  },
  publicSlug: {
    type: String,
    required: [true, 'Public slug is required'],
    unique: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Asset', assetSchema);
