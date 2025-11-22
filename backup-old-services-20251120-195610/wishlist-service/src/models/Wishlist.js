const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'My Wishlist',
    },
    description: {
      type: String,
      maxlength: 500,
    },
    listings: [
      {
        listingId: {
          type: String,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          maxlength: 200,
        },
      },
    ],
    isPrivate: {
      type: Boolean,
      default: true,
    },
    coverImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
wishlistSchema.index({ user: 1, createdAt: -1 });
wishlistSchema.index({ user: 1, name: 1 });
wishlistSchema.index({ 'listings.listingId': 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);
