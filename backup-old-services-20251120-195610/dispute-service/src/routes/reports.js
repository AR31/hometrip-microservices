const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth, isAdmin } = require('../middleware/auth');
const controller = require('../controllers/disputeController');

// Create report
router.post(
  '/',
  auth,
  [
    body('reportedUser').optional().notEmpty(),
    body('reportedListing').optional().notEmpty(),
    body('reportType').isIn([
      'inappropriate_content',
      'spam',
      'scam',
      'harassment',
      'fake_listing',
      'discrimination',
      'safety_concern',
      'copyright',
      'other',
    ]),
    body('reason').notEmpty().isLength({ max: 1000 }),
    body('evidence').optional().isArray(),
  ],
  controller.createReport
);

// Get all reports (admin only)
router.get('/', auth, isAdmin, controller.getAllReports);

// Update report status (admin only)
router.put(
  '/:id',
  auth,
  isAdmin,
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['pending', 'under_review', 'action_taken', 'dismissed', 'closed']),
    body('resolution').optional().isLength({ max: 1000 }),
    body('actionTaken').optional().isIn([
      'warning',
      'content_removed',
      'user_suspended',
      'user_banned',
      'listing_removed',
      'no_action',
      'other',
    ]),
  ],
  controller.updateReportStatus
);

module.exports = router;
