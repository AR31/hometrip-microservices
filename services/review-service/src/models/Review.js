const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Review Target Information
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true
    },

    // User Information
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Review Content
    reviewType: {
      type: String,
      enum: ['guest-to-host', 'host-to-guest'],
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000
    },

    // Detailed Ratings
    ratings: {
      cleanliness: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      checkIn: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 }
    },

    // Photos
    photos: [
      {
        url: String,
        publicId: String, // Cloudinary
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    // Host Response
    hostResponse: {
      comment: String,
      respondedAt: Date
    },

    // Helpfulness
    helpfulCount: { type: Number, default: 0 },

    // Moderation
    isPublic: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
    flaggedBy: mongoose.Schema.Types.ObjectId,
    flaggedAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes
reviewSchema.index({ listing: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ reservation: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ isPublic: 1, isFlagged: 1 });

// Methods
reviewSchema.statics.calculateAverageRating = async function (listingId) {
  try {
    const stats = await this.aggregate([
      { $match: { listing: mongoose.Types.ObjectId(listingId), isPublic: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          averageCleanliness: { $avg: '$ratings.cleanliness' },
          averageCommunication: { $avg: '$ratings.communication' },
          averageCheckIn: { $avg: '$ratings.checkIn' },
          averageAccuracy: { $avg: '$ratings.accuracy' },
          averageLocation: { $avg: '$ratings.location' },
          averageValue: { $avg: '$ratings.value' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || null;
  } catch (error) {
    throw error;
  }
};

reviewSchema.statics.calculateUserRating = async function (userId) {
  try {
    const stats = await this.aggregate([
      { $match: { reviewee: mongoose.Types.ObjectId(userId), isPublic: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || null;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Review', reviewSchema);
