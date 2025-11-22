const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

// Webhook secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Handler principal du webhook Stripe
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Vérifier que la requête vient bien de Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.logError('Webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log pour debugging
  logger.logWebhookEvent(event.type, event.id, {
    livemode: event.livemode,
    apiVersion: event.api_version,
  });

  // Gérer différents types d'événements
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      case 'customer.subscription.deleted':
        // Pour les abonnements futurs (host premium, etc.)
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Toujours répondre 200 pour que Stripe arrête de retry
    res.json({ received: true, eventId: event.id });
  } catch (error) {
    logger.logError('Error processing webhook', error, {
      eventType: event.type,
      eventId: event.id,
    });

    // Même en cas d'erreur, on répond 200 pour éviter les retry infinis
    res.json({
      received: true,
      error: error.message,
      eventId: event.id,
    });
  }
};

/**
 * Gérer paiement réussi
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  logger.info('Payment succeeded', {
    intentId: paymentIntent.id,
    amount: paymentIntent.amount,
  });

  try {
    // Trouver le paiement lié à ce PaymentIntent
    const payment = await Payment.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn('No payment found for PaymentIntent', {
        intentId: paymentIntent.id,
      });
      return;
    }

    // Si déjà confirmée, ne rien faire (idempotence)
    if (payment.status === 'succeeded') {
      logger.info('Payment already succeeded', {
        paymentId: payment._id,
      });
      return;
    }

    // Mettre à jour le paiement
    await payment.markAsSucceeded(
      paymentIntent.charges.data[0]?.id || paymentIntent.id,
      new Date()
    );

    logger.info('Payment marked as succeeded', {
      paymentId: payment._id,
      reservationId: payment.reservationId,
    });

    // Publier événement
    await eventBus.publishEvent('payment.succeeded', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      userId: payment.userId,
      amount: payment.amount,
      stripePaymentIntentId: paymentIntent.id,
      processedAt: new Date(),
    });

    // Notifier le service de réservation
    await notifyBookingService('payment.succeeded', {
      reservationId: payment.reservationId,
      paymentId: payment._id.toString(),
      amount: payment.amount,
    });

    // Notifier le service de notification
    await notifyNotificationService({
      type: 'payment_confirmed',
      reservationId: payment.reservationId,
      userId: payment.userId,
      amount: payment.amount,
    });
  } catch (error) {
    logger.logError('Error in handlePaymentIntentSucceeded', error, {
      intentId: paymentIntent.id,
    });
    throw error;
  }
}

/**
 * Gérer paiement échoué
 */
async function handlePaymentIntentFailed(paymentIntent) {
  logger.info('Payment failed', {
    intentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });

  try {
    const payment = await Payment.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn('No payment found for failed PaymentIntent', {
        intentId: paymentIntent.id,
      });
      return;
    }

    // Marquer comme échoué
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    const failureCode = paymentIntent.last_payment_error?.code || null;

    await payment.markAsFailed(failureReason, failureCode);

    logger.info('Payment marked as failed', {
      paymentId: payment._id,
      reason: failureReason,
    });

    // Publier événement
    await eventBus.publishEvent('payment.failed', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      userId: payment.userId,
      reason: failureReason,
      code: failureCode,
      processedAt: new Date(),
    });

    // Notifier le service de réservation
    await notifyBookingService('payment.failed', {
      reservationId: payment.reservationId,
      paymentId: payment._id.toString(),
      reason: failureReason,
    });

    // Notifier le service de notification
    await notifyNotificationService({
      type: 'payment_failed',
      reservationId: payment.reservationId,
      userId: payment.userId,
      reason: failureReason,
    });
  } catch (error) {
    logger.logError('Error in handlePaymentIntentFailed', error, {
      intentId: paymentIntent.id,
    });
    throw error;
  }
}

/**
 * Gérer remboursement
 */
async function handleChargeRefunded(charge) {
  logger.info('Charge refunded', {
    chargeId: charge.id,
    amountRefunded: charge.amount_refunded,
  });

  try {
    // Le PaymentIntent ID est dans charge.payment_intent
    const payment = await Payment.findOne({
      stripePaymentIntentId: charge.payment_intent,
    });

    if (!payment) {
      logger.warn('No payment found for refunded charge', {
        chargeId: charge.id,
      });
      return;
    }

    // Mettre à jour le statut
    const refundAmount = charge.amount_refunded / 100; // Convertir de centimes
    await payment.markAsRefunded(refundAmount, 'Refunded via Stripe');

    logger.info('Payment marked as refunded', {
      paymentId: payment._id,
      refundAmount,
    });

    // Publier événement
    await eventBus.publishEvent('payment.refunded', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      userId: payment.userId,
      refundAmount,
      stripeChargeId: charge.id,
      processedAt: new Date(),
    });

    // Notifier le service de notification
    await notifyNotificationService({
      type: 'payment_refunded',
      reservationId: payment.reservationId,
      userId: payment.userId,
      refundAmount,
    });
  } catch (error) {
    logger.logError('Error in handleChargeRefunded', error, {
      chargeId: charge.id,
    });
    throw error;
  }
}

/**
 * Gérer litige de charge
 */
async function handleChargeDispute(dispute) {
  logger.warn('Charge dispute created', {
    disputeId: dispute.id,
    chargeId: dispute.charge,
    reason: dispute.reason,
  });

  try {
    const payment = await Payment.findOne({
      stripeChargeId: dispute.charge,
    });

    if (!payment) {
      logger.warn('No payment found for disputed charge', {
        chargeId: dispute.charge,
      });
      return;
    }

    // Publier événement
    await eventBus.publishEvent('payment.disputed', {
      paymentId: payment._id.toString(),
      reservationId: payment.reservationId,
      userId: payment.userId,
      disputeId: dispute.id,
      reason: dispute.reason,
    });

    // Notifier les services concernés
    await notifyNotificationService({
      type: 'payment_disputed',
      reservationId: payment.reservationId,
      userId: payment.userId,
      disputeId: dispute.id,
    });
  } catch (error) {
    logger.logError('Error in handleChargeDispute', error, {
      disputeId: dispute.id,
    });
  }
}

/**
 * Gérer suppression d'abonnement
 */
async function handleSubscriptionDeleted(subscription) {
  logger.info('Subscription deleted', {
    subscriptionId: subscription.id,
  });

  // TODO: Implémenter la logique d'abonnement (host premium, etc.)
}

/**
 * Notifier le service de réservation
 */
async function notifyBookingService(eventType, data) {
  try {
    await axios.post(
      `${config.BOOKING_SERVICE_URL}/api/internal/payment-notification`,
      {
        eventType,
        data,
        timestamp: new Date(),
      },
      {
        timeout: 5000,
        headers: {
          'x-service-name': 'payment-service',
          'x-api-key': process.env.SERVICE_API_KEY || 'internal-key',
        },
      }
    );

    logger.info(`Booking service notified: ${eventType}`, {
      reservationId: data.reservationId,
    });
  } catch (error) {
    logger.warn(`Failed to notify booking service: ${eventType}`, {
      error: error.message,
      reservationId: data.reservationId,
    });
  }
}

/**
 * Notifier le service de notification
 */
async function notifyNotificationService(data) {
  try {
    await axios.post(
      `${config.NOTIFICATION_SERVICE_URL}/api/internal/send-notification`,
      data,
      {
        timeout: 5000,
        headers: {
          'x-service-name': 'payment-service',
        },
      }
    );

    logger.info('Notification service notified', {
      type: data.type,
    });
  } catch (error) {
    logger.warn('Failed to notify notification service', {
      error: error.message,
      type: data.type,
    });
  }
}
