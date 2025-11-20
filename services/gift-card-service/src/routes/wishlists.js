const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const controller = require('../controllers/gift-cardController');

/**
 * @swagger
 * tags:
 *   name: Wishlists
 *   description: Wishlist management endpoints
 */

// Create gift-card
router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('isPrivate').optional().isBoolean(),
  ],
  controller.createWishlist
);

// Get user's gift-cards
router.get('/', auth, controller.getUserWishlists);

// Get gift-card by ID
router.get('/:id', optionalAuth, param('id').isMongoId(), controller.getWishlistById);

// Update gift-card
router.put('/:id', auth, param('id').isMongoId(), controller.updateWishlist);

// Delete gift-card
router.delete('/:id', auth, param('id').isMongoId(), controller.deleteWishlist);

// Add listing to gift-card
router.post(
  '/:id/listings',
  auth,
  [
    param('id').isMongoId(),
    body('listingId').notEmpty(),
    body('notes').optional().isLength({ max: 200 }),
  ],
  controller.addListingToWishlist
);

// Remove listing from gift-card
router.delete(
  '/:id/listings/:listingId',
  auth,
  [param('id').isMongoId(), param('listingId').notEmpty()],
  controller.removeListingFromWishlist
);

// Check if listing is in gift-cards
router.get(
  '/check/:listingId',
  auth,
  param('listingId').notEmpty(),
  controller.checkListingInWishlists
);

module.exports = router;
