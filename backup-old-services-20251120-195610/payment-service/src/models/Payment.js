const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // References to other services (using IDs as foreign keys)
    reservationId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    listingId: {
      type: String,
      required: false,
      index: true,
    },

    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF'],
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'wallet', 'stripe'],
      default: 'stripe',
    },
    description: {
      type: String,
      default: '',
    },

    // Payment status lifecycle
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Stripe integration
    stripePaymentIntentId: {
      type: String,
      index: true,
    },
    stripeChargeId: {
      type: String,
      index: true,
    },
    stripeCustomerId: {
      type: String,
    },
    stripePaymentMethodId: {
      type: String,
    },

    // Payment execution details
    successAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    failureCode: {
      type: String,
    },

    // Refund information
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundReason: {
      type: String,
    },
    stripeRefundId: {
      type: String,
      index: true,
    },

    // Host payout information (Stripe Connect)
    hostPayoutId: {
      type: String,
    },
    hostPayoutStatus: {
      type: String,
      enum: ['pending', 'initiated', 'completed', 'failed'],
      default: 'pending',
    },
    hostCommission: {
      type: Number,
      default: 0,
    },
    applicationFee: {
      type: Number,
      default: 0,
    },

    // Additional metadata
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },

    // Audit trail
    notes: {
      type: String,
    },
    processedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

// Indexes
paymentSchema.index({ reservationId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ stripeChargeId: 1 });
paymentSchema.index({ stripeRefundId: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ successAt: 1 });

// Virtual field for refund status
paymentSchema.virtual('isRefunded').get(function () {
  return this.status === 'refunded';
});

// Virtual field for payment successful
paymentSchema.virtual('isSuccessful').get(function () {
  return this.status === 'succeeded';
});

// Virtual field for refundable amount
paymentSchema.virtual('refundableAmount').get(function () {
  if (this.status !== 'succeeded') return 0;
  if (this.refundAmount) return this.amount - this.refundAmount;
  return this.amount;
});

// Methods
paymentSchema.methods.markAsSucceeded = function (stripeChargeId, successAt = new Date()) {
  this.status = 'succeeded';
  this.stripeChargeId = stripeChargeId;
  this.successAt = successAt;
  this.failureReason = null;
  this.failureCode = null;
  return this.save();
};

paymentSchema.methods.markAsFailed = function (reason, code = null, failedAt = new Date()) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failureCode = code;
  this.failedAt = failedAt;
  return this.save();
};

paymentSchema.methods.markAsRefunded = function (refundAmount, refundReason = '', refundedAt = new Date()) {
  this.status = 'refunded';
  this.refundedAt = refundedAt;
  this.refundAmount = refundAmount || this.amount;
  this.refundReason = refundReason;
  return this.save();
};

paymentSchema.methods.initiateHostPayout = function (payoutId) {
  this.hostPayoutId = payoutId;
  this.hostPayoutStatus = 'initiated';
  return this.save();
};

paymentSchema.methods.completeHostPayout = function () {
  this.hostPayoutStatus = 'completed';
  return this.save();
};

// Static methods
paymentSchema.statics.findByStripePaymentIntentId = function (intentId) {
  return this.findOne({ stripePaymentIntentId: intentId });
};

paymentSchema.statics.findByReservationId = function (reservationId) {
  return this.findOne({ reservationId });
};

paymentSchema.statics.findUserPayments = function (userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

paymentSchema.statics.getPaymentStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return stats;
};

// Ensure virtuals are included in JSON
paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);
