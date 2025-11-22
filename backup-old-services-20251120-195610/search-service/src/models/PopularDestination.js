const mongoose = require('mongoose');

const popularDestinationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    country: String,
    searchCount: {
      type: Number,
      default: 0
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    imageUrl: String,
    description: String,
    lat: Number,
    lng: Number,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'popular_destinations'
  }
);

// Index for sorting by popularity
popularDestinationSchema.index({ searchCount: -1 });
popularDestinationSchema.index({ bookingCount: -1 });

module.exports = mongoose.model('PopularDestination', popularDestinationSchema);
