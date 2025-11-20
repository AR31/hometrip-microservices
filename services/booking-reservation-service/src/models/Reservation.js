const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    // Core references
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Dates
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Number of nights calculated
    numberOfNights: { type: Number, required: true },

    // Guest details
    numberOfGuests: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 }
    },

    // Pricing breakdown
    pricing: {
      nightlyRate: { type: Number, required: true },
      numberOfNights: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },

    // Reservation status
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "declined"],
      default: "pending"
    },

    // Cancellation information
    cancellation: {
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      cancelledAt: { type: Date },
      reason: { type: String },
      refundAmount: { type: Number }
    },

    // Payment information
    paymentIntentId: { type: String },
    stripeChargeId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending"
    },

    // Gift card support
    giftCardCode: { type: String },
    giftCardAmount: { type: Number, default: 0 },

    // Special requests from guest
    specialRequests: { type: String, maxlength: 500 },

    // Cancellation policy applied
    cancellationPolicy: {
      type: String,
      enum: ["flexible", "moderate", "strict", "super_strict"],
      required: true
    },

    // Review tracking
    hasUserReviewed: { type: Boolean, default: false },
    hasHostReviewed: { type: Boolean, default: false },

    // Important dates
    confirmedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes for optimal query performance
reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ listing: 1, startDate: 1, endDate: 1 });
reservationSchema.index({ host: 1, status: 1, createdAt: -1 });
reservationSchema.index({
  listing: 1,
  startDate: 1,
  endDate: 1,
  status: 1
});
reservationSchema.index({ paymentIntentId: 1 });
reservationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Reservation", reservationSchema);
