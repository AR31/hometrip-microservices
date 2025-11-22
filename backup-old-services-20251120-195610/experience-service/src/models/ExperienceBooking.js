const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     ExperienceBooking:
 *       type: object
 *       required:
 *         - experience
 *         - user
 *         - host
 *         - date
 *         - startTime
 *         - numberOfParticipants
 *         - totalPrice
 *       properties:
 *         experience:
 *           type: string
 *           description: Experience ID
 *         user:
 *           type: string
 *           description: User ID (guest)
 *         host:
 *           type: string
 *           description: Host user ID
 *         date:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         numberOfParticipants:
 *           type: number
 *         participantDetails:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: number
 *               email:
 *                 type: string
 *         totalPrice:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled, declined]
 *         paymentIntentId:
 *           type: string
 *         specialRequests:
 *           type: string
 *         cancellationReason:
 *           type: string
 *         refundAmount:
 *           type: number
 */

const experienceBookingSchema = new mongoose.Schema(
  {
    experience: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experience',
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
    host: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    numberOfParticipants: {
      type: Number,
      required: true,
      min: 1,
    },
    participantDetails: [
      {
        name: {
          type: String,
          required: true,
        },
        age: {
          type: Number,
          min: 0,
        },
        email: {
          type: String,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'declined'],
      default: 'pending',
      index: true,
    },
    paymentIntentId: {
      type: String,
      index: true,
    },
    specialRequests: {
      type: String,
      maxlength: 500,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    cancelledAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
experienceBookingSchema.index({ experience: 1, date: 1 });
experienceBookingSchema.index({ user: 1, status: 1, createdAt: -1 });
experienceBookingSchema.index({ host: 1, status: 1, createdAt: -1 });
experienceBookingSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('ExperienceBooking', experienceBookingSchema);
