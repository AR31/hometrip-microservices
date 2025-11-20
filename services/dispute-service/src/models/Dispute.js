const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    reservation: {
      type: String,
      required: true,
      index: true,
    },
    initiatedBy: {
      type: String,
      required: true,
      index: true,
    },
    against: {
      type: String,
      required: true,
      index: true,
    },
    disputeType: {
      type: String,
      required: true,
      enum: [
        'payment',
        'cancellation',
        'property_condition',
        'house_rules',
        'communication',
        'refund',
        'damage',
        'other',
      ],
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ['image', 'document', 'video', 'link'],
        },
        url: String,
        description: String,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'under_review', 'escalated', 'resolved', 'rejected', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    resolutionNotes: {
      type: String,
      maxlength: 2000,
    },
    resolvedBy: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
disputeSchema.index({ initiatedBy: 1, status: 1, createdAt: -1 });
disputeSchema.index({ against: 1, status: 1 });
disputeSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('Dispute', disputeSchema);
