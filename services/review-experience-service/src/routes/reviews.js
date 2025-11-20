const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const {
  createReview,
  getListingReviews,
  getUserReviews,
  respondToReview,
  flagReview,
  moderateReview,
  getModerationQueue,
  getReviewStats,
  deleteReview
} = require('../controllers/reviewController');

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
 * POST /reviews
 * Create a new review
 */
router.post(
  '/',
  auth,
  [
    body('listingId').notEmpty().withMessage('Listing ID is required'),
    body('reservationId').notEmpty().withMessage('Reservation ID is required'),
    body('revieweeId').notEmpty().withMessage('Reviewee ID is required'),
    body('reviewType')
      .isIn(['guest-to-host', 'host-to-guest'])
      .withMessage('Review type must be guest-to-host or host-to-guest'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .notEmpty()
      .withMessage('Comment is required')
      .isLength({ max: 1000 })
      .withMessage('Comment must be less than 1000 characters'),
    body('ratings').optional().isObject(),
    body('photos').optional().isArray()
  ],
  handleValidationErrors,
  createReview
);

/**
 * GET /reviews/listing/:listingId
 * Get reviews for a specific listing
 */
router.get(
  '/listing/:listingId',
  [
    param('listingId').notEmpty().withMessage('Listing ID is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  getListingReviews
);

/**
 * GET /reviews/user/:userId
 * Get reviews received by a specific user
 */
router.get(
  '/user/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('reviewType').optional().isIn(['guest-to-host', 'host-to-guest'])
  ],
  handleValidationErrors,
  getUserReviews
);

/**
 * GET /reviews/stats/:listingId
 * Get review statistics for a listing
 */
router.get(
  '/stats/:listingId',
  [param('listingId').notEmpty().withMessage('Listing ID is required')],
  handleValidationErrors,
  getReviewStats
);

/**
 * POST /reviews/:reviewId/response
 * Respond to a review (host only)
 */
router.post(
  '/:reviewId/response',
  auth,
  [
    param('reviewId').notEmpty().withMessage('Review ID is required'),
    body('comment')
      .notEmpty()
      .withMessage('Response comment is required')
      .isLength({ max: 500 })
      .withMessage('Response must be less than 500 characters')
  ],
  handleValidationErrors,
  respondToReview
);

/**
 * POST /reviews/:reviewId/flag
 * Flag a review for moderation
 */
router.post(
  '/:reviewId/flag',
  auth,
  [
    param('reviewId').notEmpty().withMessage('Review ID is required'),
    body('reason')
      .notEmpty()
      .withMessage('Flag reason is required')
      .isLength({ max: 200 })
      .withMessage('Reason must be less than 200 characters')
  ],
  handleValidationErrors,
  flagReview
);

/**
 * POST /reviews/:reviewId/moderate
 * Moderate a review (admin only)
 */
router.post(
  '/:reviewId/moderate',
  auth,
  requireRole(['admin', 'moderator']),
  [
    param('reviewId').notEmpty().withMessage('Review ID is required'),
    body('action')
      .isIn(['approve', 'reject'])
      .withMessage('Action must be approve or reject'),
    body('reason').optional().isString()
  ],
  handleValidationErrors,
  moderateReview
);

/**
 * GET /reviews/moderation/queue
 * Get moderation queue (admin only)
 */
router.get(
  '/moderation/queue',
  auth,
  requireRole(['admin', 'moderator']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  getModerationQueue
);

/**
 * DELETE /reviews/:reviewId
 * Delete a review
 */
router.delete(
  '/:reviewId',
  auth,
  [param('reviewId').notEmpty().withMessage('Review ID is required')],
  handleValidationErrors,
  deleteReview
);

module.exports = router;
