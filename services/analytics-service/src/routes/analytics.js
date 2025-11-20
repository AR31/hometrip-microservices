const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');
const logger = require('../utils/logger');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route GET /analytics/host/stats
 * @desc Get host dashboard statistics
 * @access Private (Host)
 */
router.get(
  '/host/stats',
  auth,
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid period'),
  handleValidationErrors,
  analyticsController.getHostStats
);

/**
 * @route GET /analytics/admin/stats
 * @desc Get admin dashboard KPIs
 * @access Private (Admin)
 */
router.get(
  '/admin/stats',
  auth,
  requireRole(['admin']),
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid period'),
  handleValidationErrors,
  analyticsController.getAdminStats
);

/**
 * @route GET /analytics/summary
 * @desc Get analytics summary
 * @access Private (Host, Admin)
 */
router.get(
  '/summary',
  auth,
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  handleValidationErrors,
  analyticsController.getSummary
);

/**
 * @route POST /analytics/report
 * @desc Generate analytics report
 * @access Private (Host, Admin)
 */
router.post(
  '/report',
  auth,
  body('reportType')
    .isIn(['host', 'admin'])
    .withMessage('Invalid report type'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Invalid format'),
  handleValidationErrors,
  analyticsController.generateReport
);

/**
 * @route POST /analytics/track
 * @desc Track analytics event (internal endpoint)
 * @access Private (Internal)
 */
router.post(
  '/track',
  body('eventType')
    .notEmpty()
    .withMessage('Event type is required'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
  handleValidationErrors,
  analyticsController.trackEvent
);

module.exports = router;
