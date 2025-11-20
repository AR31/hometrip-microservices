const mongoose = require('mongoose');

const giftCardSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 10,
      max: 1000,
    },
    balance: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF'],
    },
    purchasedBy: {
      type: String,
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    paymentIntentId: {
      type: String,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'redeemed', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    redeemedAt: {
      type: Date,
    },
    redeemedBy: {
      type: String,
    },
    transactions: [
      {
        reservationId: String,
        amount: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
giftCardSchema.index({ code: 1 });
giftCardSchema.index({ purchasedBy: 1, createdAt: -1 });
giftCardSchema.index({ recipientEmail: 1 });
giftCardSchema.index({ status: 1, expiresAt: 1 });

// Generate unique code
giftCardSchema.statics.generateCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('GiftCard', giftCardSchema);
