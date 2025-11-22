const express = require('express');
const { query, validationResult } = require('express-validator');
const searchController = require('../controllers/searchController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Search listings
 * GET /search
 */
router.get(
  '/',
  optionalAuth,
  [
    query('q').optional().trim(),
    query('location').optional().trim(),
    query('city').optional().trim(),
    query('country').optional().trim(),
    query('minPrice').optional().isInt({ min: 0 }),
    query('maxPrice').optional().isInt({ min: 0 }),
    query('guests').optional().isInt({ min: 1 }),
    query('bedrooms').optional().isInt({ min: 0 }),
    query('beds').optional().isInt({ min: 0 }),
    query('bathrooms').optional().isInt({ min: 0 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  searchController.search
);

/**
 * Autocomplete suggestions
 * GET /search/autocomplete
 */
router.get(
  '/autocomplete',
  optionalAuth,
  [
    query('q').trim().isLength({ min: 1 }).withMessage('Query required'),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  searchController.autocomplete
);

/**
 * Get popular destinations
 * GET /search/popular
 */
router.get(
  '/popular',
  optionalAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  searchController.getPopularDestinations
);

/**
 * Get available filters
 * GET /search/filters
 */
router.get(
  '/filters',
  optionalAuth,
  searchController.getFilters
);

/**
 * Get user's search history (requires auth)
 * GET /search/history
 */
router.get(
  '/history',
  requireAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  searchController.getSearchHistory
);

/**
 * Clear user's search history (requires auth)
 * DELETE /search/history
 */
router.delete(
  '/history',
  requireAuth,
  searchController.clearSearchHistory
);

module.exports = router;
