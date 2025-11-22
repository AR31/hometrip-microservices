const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true
    },
    sessionId: {
      type: String,
      required: false,
      index: true
    },
    query: {
      type: String,
      required: true,
      index: true
    },
    filters: {
      location: String,
      city: String,
      country: String,
      minPrice: Number,
      maxPrice: Number,
      guests: Number,
      bedrooms: Number,
      beds: Number,
      bathrooms: Number,
      structure: String,
      propertyType: String,
      amenities: [String],
      checkIn: Date,
      checkOut: Date,
      petsAllowed: Boolean,
      instantBooking: Boolean,
      selfCheckIn: Boolean,
      freeParking: Boolean,
      topRated: Boolean,
      smokingAllowed: Boolean,
      partiesAllowed: Boolean,
      childrenAllowed: Boolean,
      sortBy: String
    },
    resultsCount: {
      type: Number,
      default: 0
    },
    selectedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    searchType: {
      type: String,
      enum: ['basic', 'advanced', 'autocomplete'],
      default: 'basic'
    },
    ipAddress: String,
    userAgent: String,
    responseTime: Number // in milliseconds
  },
  {
    timestamps: true,
    collection: 'search_history'
  }
);

// Index for analytics
searchHistorySchema.index({ createdAt: -1 });
searchHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
