const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhook
 *   description: Stripe webhook endpoint
 */

/**
 * @swagger
 * /webhook:
 *   post:
 *     summary: Stripe webhook handler
 *     tags: [Webhook]
 *     description: |
 *       Endpoint for receiving Stripe events.
 *
 *       IMPORTANT: This endpoint uses express.raw() to validate Stripe signatures.
 *       The body must remain unparsed for signature verification to work correctly.
 *
 *       Do not call this endpoint directly - it's only for Stripe webhook delivery.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe event object
 *     responses:
 *       200:
 *         description: Webhook received successfully
 *       400:
 *         description: Signature verification failed
 *     x-internal: true
 */

// IMPORTANT: express.raw() is required to validate Stripe signatures
// The body must remain raw (not parsed to JSON) for validation to work
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

module.exports = router;
