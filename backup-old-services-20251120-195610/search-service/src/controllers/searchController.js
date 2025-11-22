const elasticsearchService = require('../services/elasticsearchService');
const SearchHistory = require('../models/SearchHistory');
const PopularDestination = require('../models/PopularDestination');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');

/**
 * Advanced search with filters
 * GET /search
 */
exports.search = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      q = '',
      location = '',
      city = '',
      country = '',
      minPrice = 0,
      maxPrice = 10000,
      guests = 0,
      bedrooms = 0,
      beds = 0,
      bathrooms = 0,
      structure = '',
      propertyType = '',
      amenities = '',
      petsAllowed = false,
      instantBooking = false,
      selfCheckIn = false,
      freeParking = false,
      topRated = false,
      checkIn = '',
      checkOut = '',
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // Build filter object
    const filters = {
      minPrice: minPrice ? Math.max(0, parseInt(minPrice)) : undefined,
      maxPrice: maxPrice ? Math.max(1, parseInt(maxPrice)) : undefined,
      guests: guests ? Math.max(1, parseInt(guests)) : undefined,
      bedrooms: bedrooms ? Math.max(1, parseInt(bedrooms)) : undefined,
      beds: beds ? Math.max(1, parseInt(beds)) : undefined,
      bathrooms: bathrooms ? Math.max(1, parseInt(bathrooms)) : undefined,
      city: city || location || '',
      country: country || '',
      structure: structure || '',
      propertyType: propertyType || '',
      amenities: amenities ? amenities.split(',').map(a => a.trim()) : [],
      petsAllowed: petsAllowed === 'true',
      instantBooking: instantBooking === 'true',
      selfCheckIn: selfCheckIn === 'true',
      freeParking: freeParking === 'true',
      topRated: topRated === 'true',
      sortBy: sortBy || 'relevance',
      checkIn: checkIn || '',
      checkOut: checkOut || ''
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === '' || (Array.isArray(filters[key]) && filters[key].length === 0)) {
        delete filters[key];
      }
    });

    // Search in Elasticsearch
    const result = await elasticsearchService.search(
      q || location || city,
      filters,
      pageNum,
      limitNum
    );

    // Record search history (async, don't wait)
    if (req.userId || req.sessionId) {
      recordSearchHistory({
        userId: req.userId,
        sessionId: req.sessionId,
        query: q || location || city || 'General search',
        filters: req.query,
        resultsCount: result.pagination.total,
        searchType: 'advanced',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        responseTime: Date.now() - startTime
      }).catch(err => logger.warn('Failed to record search history:', err));
    }

    res.json({
      success: true,
      data: {
        listings: result.listings,
        pagination: result.pagination
      },
      meta: {
        responseTime: Date.now() - startTime
      }
    });

  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

/**
 * Autocomplete suggestions
 * GET /search/autocomplete
 */
exports.autocomplete = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = await elasticsearchService.autocomplete(
      q.trim(),
      Math.min(100, Math.max(1, parseInt(limit) || 10))
    );

    res.json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    logger.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Autocomplete failed',
      error: error.message
    });
  }
};

/**
 * Get popular destinations
 * GET /search/popular
 */
exports.getPopularDestinations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const destinations = await elasticsearchService.getPopularDestinations(
      Math.min(50, Math.max(1, parseInt(limit) || 10))
    );

    res.json({
      success: true,
      destinations: destinations
    });

  } catch (error) {
    logger.error('Popular destinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular destinations',
      error: error.message
    });
  }
};

/**
 * Get search suggestions with filters
 * GET /search/filters
 */
exports.getFilters = async (req, res) => {
  try {
    // Return available filter options
    // These can be statically defined or fetched from Elasticsearch aggregations
    res.json({
      success: true,
      filters: {
        propertyTypes: [
          'Apartment',
          'House',
          'Villa',
          'Studio',
          'Room',
          'Townhouse',
          'Bungalow'
        ],
        amenities: [
          'WiFi',
          'Air conditioning',
          'Heating',
          'Kitchen',
          'Washer',
          'Dryer',
          'Parking',
          'Pool',
          'Hot tub',
          'Gym',
          'TV',
          'Balcony',
          'Garden',
          'Pets allowed'
        ],
        priceRange: {
          min: 0,
          max: 10000
        },
        booleanFilters: [
          { key: 'petsAllowed', label: 'Pets Allowed' },
          { key: 'instantBooking', label: 'Instant Booking' },
          { key: 'selfCheckIn', label: 'Self Check-in' },
          { key: 'freeParking', label: 'Free Parking' },
          { key: 'topRated', label: 'Top Rated' }
        ],
        sortOptions: [
          { value: 'relevance', label: 'Relevance' },
          { value: 'price-asc', label: 'Price: Low to High' },
          { value: 'price-desc', label: 'Price: High to Low' },
          { value: 'rating', label: 'Rating' },
          { value: 'popular', label: 'Most Popular' },
          { value: 'newest', label: 'Newest' }
        ]
      }
    });

  } catch (error) {
    logger.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filters',
      error: error.message
    });
  }
};

/**
 * Get user's search history
 * GET /search/history
 */
exports.getSearchHistory = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { limit = 20 } = req.query;

    const history = await SearchHistory.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(100, parseInt(limit) || 20))
      .lean();

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    logger.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search history',
      error: error.message
    });
  }
};

/**
 * Clear user's search history
 * DELETE /search/history
 */
exports.clearSearchHistory = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    await SearchHistory.deleteMany({ userId: req.userId });

    res.json({
      success: true,
      message: 'Search history cleared'
    });

  } catch (error) {
    logger.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history',
      error: error.message
    });
  }
};

/**
 * Record search history
 */
async function recordSearchHistory(data) {
  try {
    const history = new SearchHistory(data);
    await history.save();
    logger.debug(`Search history recorded: ${data.query}`);

    // Update popular destinations
    if (data.filters?.city) {
      await PopularDestination.findOneAndUpdate(
        { city: data.filters.city },
        { $inc: { searchCount: 1 } },
        { upsert: true }
      );
    }
  } catch (error) {
    logger.error('Error recording search history:', error);
  }
}

// Export recordSearchHistory for internal use
module.exports.recordSearchHistory = recordSearchHistory;
