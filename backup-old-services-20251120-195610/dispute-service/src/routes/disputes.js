const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth, isAdmin } = require('../middleware/auth');
const controller = require('../controllers/disputeController');

// Create dispute
router.post(
  '/',
  auth,
  [
    body('reservation').notEmpty(),
    body('against').notEmpty(),
    body('disputeType').isIn([
      'payment',
      'cancellation',
      'property_condition',
      'house_rules',
      'communication',
      'refund',
      'damage',
      'other',
    ]),
    body('description').notEmpty().isLength({ max: 2000 }),
    body('evidence').optional().isArray(),
  ],
  controller.createDispute
);

// Get user's disputes
router.get('/my', auth, controller.getUserDisputes);

// Get dispute by ID
router.get('/:id', auth, param('id').isMongoId(), controller.getDisputeById);

// Resolve dispute (admin only)
router.post(
  '/:id/resolve',
  auth,
  isAdmin,
  [
    param('id').isMongoId(),
    body('resolutionNotes').notEmpty().isLength({ max: 2000 }),
    body('refundAmount').optional().isFloat({ min: 0 }),
  ],
  controller.resolveDispute
);

module.exports = router;
