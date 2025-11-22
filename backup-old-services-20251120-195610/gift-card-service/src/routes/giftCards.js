const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const controller = require('../controllers/giftCardController');

// Purchase gift card
router.post(
  '/',
  auth,
  [
    body('amount').isFloat({ min: 10, max: 1000 }),
    body('recipientEmail').isEmail(),
    body('recipientName').trim().notEmpty(),
    body('message').optional().isLength({ max: 500 }),
    body('paymentIntentId').notEmpty(),
  ],
  controller.purchaseGiftCard
);

// Get user's purchased gift cards
router.get('/my', auth, controller.getPurchasedGiftCards);

// Get gift card by code (public info only)
router.get('/:code', param('code').isLength({ min: 15, max: 20 }), controller.getGiftCardByCode);

// Redeem gift card
router.post(
  '/redeem',
  auth,
  [
    body('code').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('reservationId').optional().isString(),
  ],
  controller.redeemGiftCard
);

// Confirm payment (internal/webhook)
router.post(
  '/confirm-payment',
  [body('paymentIntentId').notEmpty(), body('status').isIn(['succeeded', 'failed'])],
  controller.confirmPayment
);

module.exports = router;
