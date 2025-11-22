const express = require('express');
const paymentController = require('../controllers/paymentController');
const { auth, serviceAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management endpoints
 */

/**
 * @swagger
 * /payments/intent:
 *   post:
 *     summary: Create a payment intent for a reservation
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reservationId, userId, amount]
 *             properties:
 *               reservationId:
 *                 type: string
 *               userId:
 *                 type: string
 *               listingId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: EUR
 *     responses:
 *       201:
 *         description: Payment intent created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/intent', auth, paymentController.createPaymentIntent);

/**
 * @swagger
 * /payments/confirm:
 *   post:
 *     summary: Confirm a payment after Stripe processing
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId]
 *             properties:
 *               paymentId:
 *                 type: string
 *               stripePaymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post('/confirm', paymentController.confirmPayment);

/**
 * @swagger
 * /payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get('/:paymentId', paymentController.getPayment);

/**
 * @swagger
 * /payments/user/{userId}:
 *   get:
 *     summary: Get payments for a user
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, succeeded, failed, refunded]
 *     responses:
 *       200:
 *         description: List of payments
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', paymentController.getUserPayments);

/**
 * @swagger
 * /payments/{paymentId}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund initiated
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.post('/:paymentId/refund', auth, paymentController.refundPayment);

/**
 * @swagger
 * /payments/stripe-connect/account:
 *   post:
 *     summary: Create Stripe Connect account for host
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, email]
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *               country:
 *                 type: string
 *                 default: FR
 *     responses:
 *       200:
 *         description: Account created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/stripe-connect/account', auth, paymentController.createStripeConnectAccount);

/**
 * @swagger
 * /payments/host/payout:
 *   post:
 *     summary: Initiate host payout
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, stripeAccountId]
 *             properties:
 *               paymentId:
 *                 type: string
 *               stripeAccountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout initiated
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/host/payout', serviceAuth, paymentController.initiateHostPayout);

/**
 * @swagger
 * /payments/stats:
 *   get:
 *     summary: Get payment statistics
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Payment statistics
 *       500:
 *         description: Server error
 */
router.get('/stats', paymentController.getPaymentStats);

module.exports = router;
