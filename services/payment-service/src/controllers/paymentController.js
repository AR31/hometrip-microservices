const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

/**
 * Create a PaymentIntent for a booking
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { reservationId, userId, listingId, amount, currency = 'EUR', metadata = {} } = req.body;

    // Validate input
    if (!reservationId || !userId || !amount || amount <= 0) {
      logger.warn('Invalid payment intent request', {
        reservationId,
        userId,
        amount,
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reservationId, userId, amount',
      });
    }

    // Check if payment already exists for this reservation
    const existingPayment = await Payment.findByReservationId(reservationId);
    if (existingPayment && existingPayment.status === 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment already completed for this reservation',
        paymentId: existingPayment._id,
      });
    }

    // Create or update payment record
    let payment = existingPayment || new Payment({
      reservationId,
      userId,
      listingId,
      amount,
      currency,
      paymentMethod: 'stripe',
      description: `Payment for reservation ${reservationId}`,
    });

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        reservationId,
        userId,
        listingId,
        ...metadata,
      },
      description: `HomeTrip Reservation ${reservationId}`,
    });

    // Save payment with Stripe ID
    payment.stripePaymentIntentId = paymentIntent.id;
    payment.status = 'processing';
    await payment.save();

    logger.logPaymentEvent('payment.intent.created', {
      paymentId: payment._id,
      intentId: paymentIntent.id,
      amount,
      currency,
      reservationId,
    });

    // Publish event
    await eventBus.publishEvent('payment.created', {
      paymentId: payment._id.toString(),
      reservationId,
      userId,
      amount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      },
    });
  } catch (error) {
    logger.logError('Error creating payment intent', error, {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
    });
  }
};

/**
 * Confirm payment after Stripe confirmation
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId, stripePaymentIntentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing paymentId',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Retrieve PaymentIntent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(
      stripePaymentIntentId || payment.stripePaymentIntentId
    );

    if (paymentIntent.status === 'succeeded') {
      await payment.markAsSucceeded(paymentIntent.charges.data[0]?.id);

      logger.info('Payment confirmed', {
        paymentId: payment._id,
        intentId: paymentIntent.id,
      });

      // Publish event
      await eventBus.publishEvent('payment.succeeded', {
        paymentId: payment._id.toString(),
        reservationId: payment.reservationId,
        userId: payment.userId,
        amount: payment.amount,
        stripePaymentIntentId: paymentIntent.id,
      });

      return res.json({
        success: true,
        data: {
          paymentId: payment._id,
          status: payment.status,
        },
      });
    } else if (paymentIntent.status === 'processing') {
      return res.json({
        success: true,
        data: {
          paymentId: payment._id,
          status: 'processing',
          message: 'Payment is being processed',
        },
      });
    } else {
      await payment.markAsFailed(
        paymentIntent.last_payment_error?.message || 'Payment failed',
        paymentIntent.last_payment_error?.code
      );

      return res.status(402).json({
        success: false,
        error: 'Payment failed',
        data: {
          paymentId: payment._id,
          status: payment.status,
          reason: payment.failureReason,
        },
      });
    }
  } catch (error) {
    logger.logError('Error confirming payment', error, {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
    });
  }
};

/**
 * Get payment details
 */
exports.getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.logError('Error getting payment', error, {
      paymentId: req.params.paymentId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment',
    });
  }
};

/**
 * Get payments by user
 */
exports.getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0, status } = req.query;

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .exec();

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    logger.logError('Error getting user payments', error, {
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payments',
    });
  }
};

/**
 * Initiate refund
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason = 'Customer requested refund' } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Only succeeded payments can be refunded',
      });
    }

    if (amount && amount > payment.refundableAmount) {
      return res.status(400).json({
        success: false,
        error: `Refund amount exceeds refundable amount (${payment.refundableAmount})`,
      });
    }

    // Create refund in Stripe
    const refundAmount = amount ? Math.round(amount * 100) : null;
    const stripeRefund = await stripe.refunds.create({
      charge: payment.stripeChargeId,
      amount: refundAmount, // null means full refund
      reason: 'requested_by_customer',
      metadata: {
        paymentId: payment._id.toString(),
        reservationId: payment.reservationId,
        reason,
      },
    });

    // Update payment
    const refundedAmount = stripeRefund.amount / 100;
    await payment.markAsRefunded(refundedAmount, reason);

    logger.logPaymentEvent('payment.refunded', {
      paymentId: payment._id,
      refundId: stripeRefund.id,
      amount: refundedAmount,
    });

    // Publish event
    await eventBus.publishEvent('payment.refunded', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      userId: payment.userId,
      refundAmount: refundedAmount,
      refundReason: reason,
      stripeRefundId: stripeRefund.id,
    });

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        refundId: stripeRefund.id,
        refundAmount: refundedAmount,
        status: payment.status,
      },
    });
  } catch (error) {
    logger.logError('Error refunding payment', error, {
      paymentId: req.params.paymentId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process refund',
    });
  }
};

/**
 * Create Stripe Connect account for host
 */
exports.createStripeConnectAccount = async (req, res) => {
  try {
    const { userId, email, country = 'FR' } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or email',
      });
    }

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    logger.info('Stripe Connect account created', {
      userId,
      stripeAccountId: account.id,
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/host/stripe-onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/host/stripe-onboarding/complete`,
      type: 'account_onboarding',
    });

    // Notify user service to save the Stripe account ID
    try {
      await axios.post(
        `${config.USER_SERVICE_URL}/api/internal/update-stripe-account`,
        {
          userId,
          stripeAccountId: account.id,
        },
        {
          timeout: 5000,
          headers: {
            'x-service-name': 'payment-service',
          },
        }
      );
    } catch (error) {
      logger.warn('Failed to notify user service of Stripe account', {
        error: error.message,
        userId,
      });
    }

    res.json({
      success: true,
      data: {
        stripeAccountId: account.id,
        onboardingUrl: accountLink.url,
      },
    });
  } catch (error) {
    logger.logError('Error creating Stripe Connect account', error, {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe Connect account',
    });
  }
};

/**
 * Initiate host payout
 */
exports.initiateHostPayout = async (req, res) => {
  try {
    const { paymentId, stripeAccountId } = req.body;

    if (!paymentId || !stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing paymentId or stripeAccountId',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Only succeeded payments can be paid out',
      });
    }

    // Calculate payout amount (total - application fee)
    const payoutAmount = Math.round((payment.amount - payment.applicationFee) * 100);

    // Create transfer to host account
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: payment.currency.toLowerCase(),
      destination: stripeAccountId,
      transfer_group: `reservation_${payment.reservationId}`,
      metadata: {
        paymentId: payment._id.toString(),
        reservationId: payment.reservationId,
      },
    });

    // Update payment
    await payment.initiateHostPayout(transfer.id);

    logger.logPaymentEvent('host.payout.initiated', {
      paymentId: payment._id,
      transferId: transfer.id,
      amount: payoutAmount / 100,
    });

    // Publish event
    await eventBus.publishEvent('host.payout.initiated', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      stripeAccountId,
      transferId: transfer.id,
      payoutAmount: payoutAmount / 100,
    });

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        transferId: transfer.id,
        payoutAmount: payoutAmount / 100,
      },
    });
  } catch (error) {
    logger.logError('Error initiating host payout', error, {
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initiate payout',
    });
  }
};

/**
 * Get payment statistics
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    let query = {};
    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        stats,
        query: {
          userId,
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    logger.logError('Error getting payment stats', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
    });
  }
};
