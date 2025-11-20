const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const controller = require('../controllers/disputeController');

/**
 * @swagger
 * tags:
 *   name: Disputes
 *   description: Dispute management endpoints
 */

// Create dispute
router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('isPrivate').optional().isBoolean(),
  ],
  controller.createDispute
);

// Get user's disputes
router.get('/', auth, controller.getUserDisputes);

// Get dispute by ID
router.get('/:id', optionalAuth, param('id').isMongoId(), controller.getDisputeById);

// Update dispute
router.put('/:id', auth, param('id').isMongoId(), controller.updateDispute);

// Delete dispute
router.delete('/:id', auth, param('id').isMongoId(), controller.deleteDispute);

// Add listing to dispute
router.post(
  '/:id/listings',
  auth,
  [
    param('id').isMongoId(),
    body('listingId').notEmpty(),
    body('notes').optional().isLength({ max: 200 }),
  ],
  controller.addListingToDispute
);

// Remove listing from dispute
router.delete(
  '/:id/listings/:listingId',
  auth,
  [param('id').isMongoId(), param('listingId').notEmpty()],
  controller.removeListingFromDispute
);

// Check if listing is in disputes
router.get(
  '/check/:listingId',
  auth,
  param('listingId').notEmpty(),
  controller.checkListingInDisputes
);

module.exports = router;
