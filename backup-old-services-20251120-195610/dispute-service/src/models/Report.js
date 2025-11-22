const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: String,
      required: true,
      index: true,
    },
    reportedUser: {
      type: String,
      index: true,
    },
    reportedListing: {
      type: String,
      index: true,
    },
    reportType: {
      type: String,
      required: true,
      enum: [
        'inappropriate_content',
        'spam',
        'scam',
        'harassment',
        'fake_listing',
        'discrimination',
        'safety_concern',
        'copyright',
        'other',
      ],
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ['image', 'document', 'link', 'screenshot'],
        },
        url: String,
        description: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'action_taken', 'dismissed', 'closed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    resolution: {
      type: String,
      maxlength: 1000,
    },
    actionTaken: {
      type: String,
      enum: ['warning', 'content_removed', 'user_suspended', 'user_banned', 'listing_removed', 'no_action', 'other'],
    },
    resolvedBy: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, status: 1 });
reportSchema.index({ reportedListing: 1, status: 1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
