const amqp = require('amqplib');
const logger = require('./logger');
const notificationController = require('../controllers/notificationController');

let connection;
let channel;

// Événements auxquels s'abonner
const EVENTS = {
  'user.created': 'user_created',
  'booking.created': 'booking_request',
  'booking.confirmed': 'booking_confirmed',
  'booking.cancelled': 'booking_cancelled',
  'payment.succeeded': 'payment_received',
  'payment.failed': 'payment_failed',
  'payment.refunded': 'refund_processed',
  'message.sent': 'new_message',
  'review.created': 'review_received',
};

/**
 * Initialiser la connexion RabbitMQ
 */
const connect = async () => {
  try {
    const rabbitmqUrl =
      process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    logger.info('Connected to RabbitMQ');

    // Gérer les disconnections
    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error);
      setTimeout(() => {
        connect();
      }, 5000); // Reconnecter après 5 secondes
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    // Ignorer l'erreur et laisser l'app continuer
    return null;
  }
};

/**
 * S'abonner aux événements
 */
const subscribe = async () => {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, skipping event subscriptions');
    return;
  }

  try {
    const exchange = 'hometrip_events';
    const exchangeType = 'topic';

    // Déclarer l'exchange
    await channel.assertExchange(exchange, exchangeType, { durable: true });

    // S'abonner à chaque événement
    for (const [eventName, notificationType] of Object.entries(EVENTS)) {
      const queueName = `notification-service-${eventName}`;

      // Déclarer la queue
      const queue = await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // TTL 24h
        },
      });

      // Binder la queue à l'exchange
      await channel.bindQueue(queue.queue, exchange, eventName);

      // Consommer les messages
      await channel.consume(queue.queue, (msg) => {
        if (msg) {
          handleEvent(eventName, msg, notificationType);
          channel.ack(msg);
        }
      });

      logger.info(`Subscribed to event: ${eventName}`);
    }
  } catch (error) {
    logger.error('Error subscribing to events:', error);
  }
};

/**
 * Traiter un événement reçu
 */
const handleEvent = async (eventName, msg, notificationType) => {
  try {
    const event = JSON.parse(msg.content.toString());

    logger.debug(`Received event: ${eventName}`, event);

    // Mapper les données selon le type d'événement
    const notificationData = mapEventToNotification(
      eventName,
      event,
      notificationType
    );

    // Envoyer la notification
    if (notificationData) {
      await notificationController.sendNotification(notificationData);
    }
  } catch (error) {
    logger.error(`Error handling event ${eventName}:`, error);
  }
};

/**
 * Mapper l'événement reçu au format de notification
 */
const mapEventToNotification = (eventName, event, notificationType) => {
  try {
    switch (eventName) {
      case 'user.created':
        return {
          userId: event.userId || event.id,
          type: notificationType,
          title: 'Bienvenue sur HomeTrip!',
          message:
            'Confirmez votre email pour commencer à explorer nos destinations',
          category: 'account',
          channels: { inApp: true, email: true },
          userEmail: event.email,
          userName: event.fullName || event.name,
          confirmLink: `${process.env.FRONTEND_URL}/verify-email?token=${event.verificationToken}`,
        };

      case 'booking.created':
        return {
          userId: event.hostId,
          type: notificationType,
          title: 'Nouvelle demande de réservation',
          message: `${event.guestName} a demandé à réserver ${event.listingTitle}`,
          category: 'booking',
          channels: { inApp: true, email: true, sms: true },
          data: { bookingId: event.bookingId, listingId: event.listingId },
          hostEmail: event.hostEmail,
          hostName: event.hostName,
          guestName: event.guestName,
          listingTitle: event.listingTitle,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          guests: event.guests,
          totalPrice: event.totalPrice,
          conversationId: event.conversationId,
          phoneNumber: event.hostPhone,
        };

      case 'booking.confirmed':
        return {
          userId: event.guestId,
          type: notificationType,
          title: 'Réservation confirmée!',
          message: `Votre réservation pour ${event.listingTitle} a été confirmée`,
          category: 'booking',
          channels: { inApp: true, email: true, sms: true },
          data: { bookingId: event.bookingId, listingId: event.listingId },
          guestEmail: event.guestEmail,
          guestName: event.guestName,
          hostName: event.hostName,
          listingTitle: event.listingTitle,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          guests: event.guests,
          totalPrice: event.totalPrice,
          reservationId: event.bookingId,
          phoneNumber: event.guestPhone,
        };

      case 'booking.cancelled':
        return {
          userId: event.guestId || event.hostId,
          type: notificationType,
          title: 'Réservation annulée',
          message: `Votre réservation pour ${event.listingTitle} a été annulée`,
          category: 'booking',
          channels: { inApp: true, email: true },
          data: { bookingId: event.bookingId, listingId: event.listingId },
          guestEmail: event.guestEmail,
          guestName: event.guestName,
          hostName: event.hostName,
          listingTitle: event.listingTitle,
          reason: event.cancellationReason,
        };

      case 'payment.failed':
        return {
          userId: event.userId,
          type: notificationType,
          title: 'Paiement échoué',
          message: 'Votre paiement n\'a pas pu être traité',
          category: 'payment',
          channels: { inApp: true, email: true, sms: true },
          data: { bookingId: event.bookingId },
          userEmail: event.email,
          userName: event.fullName || event.name,
          reason: event.errorMessage,
          reservationId: event.bookingId,
          phoneNumber: event.phone,
        };

      case 'payment.refunded':
        return {
          userId: event.userId,
          type: notificationType,
          title: 'Remboursement effectué',
          message: `Un remboursement de ${event.amount} € a été traité`,
          category: 'payment',
          channels: { inApp: true, email: true },
          data: { bookingId: event.bookingId },
          userEmail: event.email,
          userName: event.fullName || event.name,
          refundAmount: event.amount,
        };

      case 'message.sent':
        return {
          userId: event.recipientId,
          type: notificationType,
          title: `Nouveau message de ${event.senderName}`,
          message: event.preview || 'Vous avez reçu un nouveau message',
          category: 'message',
          channels: { inApp: true, email: true, sms: true },
          data: { messageId: event.messageId },
          userEmail: event.recipientEmail,
          recipientName: event.recipientName,
          senderName: event.senderName,
          messagePreview: event.preview,
          conversationId: event.conversationId,
          phoneNumber: event.recipientPhone,
        };

      case 'review.created':
        return {
          userId: event.listingOwnerId,
          type: notificationType,
          title: `Nouvel avis de ${event.reviewerName}`,
          message: `Vous avez reçu un avis ${event.rating} étoiles`,
          category: 'review',
          channels: { inApp: true, email: true },
          data: { reviewId: event.reviewId, listingId: event.listingId },
          userEmail: event.ownerEmail,
          userName: event.ownerName,
          reviewerName: event.reviewerName,
          rating: event.rating,
          comment: event.comment,
          reviewLink: `${process.env.FRONTEND_URL}/listings/${event.listingId}/reviews/${event.reviewId}`,
        };

      default:
        logger.warn(`Unknown event type: ${eventName}`);
        return null;
    }
  } catch (error) {
    logger.error(`Error mapping event ${eventName}:`, error);
    return null;
  }
};

/**
 * Publier un événement (pour les tests)
 */
const publish = async (eventName, data) => {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, cannot publish event');
    return false;
  }

  try {
    const exchange = 'hometrip_events';
    const message = Buffer.from(JSON.stringify(data));

    channel.publish(exchange, eventName, message, { persistent: true });
    logger.info(`Event published: ${eventName}`, data);
    return true;
  } catch (error) {
    logger.error(`Error publishing event ${eventName}:`, error);
    return false;
  }
};

/**
 * Fermer la connexion RabbitMQ
 */
const disconnect = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('Disconnected from RabbitMQ');
  } catch (error) {
    logger.error('Error disconnecting from RabbitMQ:', error);
  }
};

module.exports = {
  connect,
  subscribe,
  publish,
  disconnect,
};
