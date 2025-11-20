const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },

    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: false
    },

    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],

    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "expired"
      ],
      default: "pending"
    },

    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      createdAt: Date
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },

    archived: {
      type: Map,
      of: Boolean,
      default: {}
    },

    typingUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      startedAt: {
        type: Date,
        default: Date.now
      }
    }],

    autoTranslate: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      targetLanguage: {
        type: String,
        default: 'fr'
      },
      enabled: {
        type: Boolean,
        default: false
      }
    }],

    labels: [{
      type: String,
      enum: ['important', 'urgent', 'pending', 'resolved', 'spam', 'favorite']
    }],

    metadata: {
      checkIn: Date,
      checkOut: Date,
      guests: Number,
      totalPrice: Number,
      listingTitle: String,
      listingImage: String
    }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, "lastMessage.createdAt": -1 });
conversationSchema.index({ guest: 1, status: 1 });
conversationSchema.index({ host: 1, status: 1 });
conversationSchema.index({ reservation: 1 });
conversationSchema.index({ labels: 1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

conversationSchema.methods.incrementUnreadCount = function(userId) {
  const current = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), current + 1);
  return this.save();
};

conversationSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

module.exports = mongoose.model("Conversation", conversationSchema);
