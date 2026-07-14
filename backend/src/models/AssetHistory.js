const mongoose = require('mongoose');

const assetHistorySchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Linked asset is required'],
  },
  actor: {
    type: String, // Refers to User ID or "Public"
    required: [true, 'Actor is required'],
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
  },
  relatedIssue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
});

module.exports = mongoose.model('AssetHistory', assetHistorySchema);
