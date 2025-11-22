const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'user_created',
        'booking_request',
        'booking_confirmed',
        'booking_cancelled',
        'payment_failed',
        'refund_processed',
        'new_message',
        'review_received',
        'verification',
        'check_in_reminder',
        'system',
        'promotion'
      ]
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['booking', 'payment', 'message', 'review', 'system', 'promotion'],
      default: 'system'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    channels: {
      inApp: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: false
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: false
      }
    },
    sentStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String
      }
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date
    },
    actionUrl: {
      type: String
    },
    actionLabel: {
      type: String
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, category: 1 });
notificationSchema.index({ userId: 1, isArchived: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      userId,
      isRead: false,
      isArchived: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
