const mongoose = require('mongoose');

/**
 * Analytics Time-Series Schema
 * Stores aggregated analytics data for hosts and admin dashboards
 */
const AnalyticsSchema = new mongoose.Schema(
  {
    // Type of analytics: 'host_dashboard', 'admin_dashboard', 'revenue', 'bookings', 'users'
    type: {
      type: String,
      enum: ['host_dashboard', 'admin_dashboard', 'revenue', 'bookings', 'users', 'listings', 'views'],
      required: true,
      index: true
    },

    // Reference to host (for host-specific analytics)
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true
    },

    // Time period (daily, weekly, monthly, yearly)
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'daily'
    },

    // Date for this analytics record
    date: {
      type: Date,
      required: true,
      index: true
    },

    // Year-Month-Day for easier querying
    yearMonthDay: {
      type: String,
      required: true,
      index: true
    },

    // Metrics object (flexible for different types)
    metrics: {
      // Revenue metrics
      totalRevenue: {
        type: Number,
        default: 0
      },
      commission: {
        type: Number,
        default: 0
      },
      platformFee: {
        type: Number,
        default: 0
      },

      // Booking metrics
      totalBookings: {
        type: Number,
        default: 0
      },
      confirmedBookings: {
        type: Number,
        default: 0
      },
      cancelledBookings: {
        type: Number,
        default: 0
      },
      completedBookings: {
        type: Number,
        default: 0
      },

      // User metrics
      newUsers: {
        type: Number,
        default: 0
      },
      activeUsers: {
        type: Number,
        default: 0
      },
      totalUsers: {
        type: Number,
        default: 0
      },
      hostCount: {
        type: Number,
        default: 0
      },
      guestCount: {
        type: Number,
        default: 0
      },

      // Listing metrics
      totalListings: {
        type: Number,
        default: 0
      },
      activeListings: {
        type: Number,
        default: 0
      },
      newListings: {
        type: Number,
        default: 0
      },
      inactiveListings: {
        type: Number,
        default: 0
      },

      // View metrics
      listingViews: {
        type: Number,
        default: 0
      },
      uniqueViewers: {
        type: Number,
        default: 0
      },

      // Occupancy metrics
      occupancyRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      availableNights: {
        type: Number,
        default: 0
      },
      bookedNights: {
        type: Number,
        default: 0
      },

      // Review metrics
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalReviews: {
        type: Number,
        default: 0
      },
      newReviews: {
        type: Number,
        default: 0
      },

      // Guest metrics
      uniqueGuests: {
        type: Number,
        default: 0
      },
      repeatingGuests: {
        type: Number,
        default: 0
      },

      // Custom metrics
      custom: mongoose.Schema.Types.Mixed
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'processed', 'archived'],
      default: 'processed'
    },

    // Source of data (for tracking)
    source: {
      type: String,
      enum: ['event', 'aggregation', 'manual'],
      default: 'event'
    }
  },
  {
    timestamps: true
  }
);

// Composite index for efficient querying
AnalyticsSchema.index({ type: 1, hostId: 1, yearMonthDay: 1 });
AnalyticsSchema.index({ date: 1, type: 1 });
AnalyticsSchema.index({ period: 1, hostId: 1, date: 1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
