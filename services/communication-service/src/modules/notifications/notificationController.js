const Notification = require('../../models/Notification');
const {
  sendUserConfirmationEmail,
  sendNewReservationRequestEmail,
  sendReservationConfirmedEmail,
  sendReservationCancelledEmail,
  sendPaymentFailedEmail,
  sendRefundConfirmationEmail,
  sendNewMessageEmail,
  sendReviewReceivedEmail,
} = require('../../services/emailService');
const {
  sendVerificationCodeSMS,
  sendReservationConfirmationSMS,
  sendCheckInReminderSMS,
  sendNewMessageSMS,
  sendPaymentFailedSMS,
} = require('../../services/smsService');
const logger = require('../../utils/logger');

/**
 * GET /api/notifications
 * Récupérer toutes les notifications de l'utilisateur
 */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, category } = req.query;
    const userId = req.user.id;

    const query = {
      userId,
      isArchived: false,
    };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (category) {
      query.category = category;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
    });
  }
};

/**
 * GET /api/notifications/:id
 * Récupérer une notification spécifique
 */
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification',
    });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marquer une notification comme lue
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
};

/**
 * PUT /api/notifications/:id/unread
 * Marquer une notification comme non lue
 */
exports.markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: false, readAt: null },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Error marking notification as unread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as unread',
    });
  }
};

/**
 * PUT /api/notifications/mark-all-read
 * Marquer toutes les notifications comme lues
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
    });
  }
};

/**
 * PUT /api/notifications/:id/archive
 * Archiver une notification
 */
exports.archiveNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Error archiving notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive notification',
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
};

/**
 * DELETE /api/notifications/bulk-delete
 * Supprimer plusieurs notifications
 */
exports.bulkDeleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IDs',
      });
    }

    const result = await Notification.deleteMany({
      _id: { $in: ids },
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) deleted`,
    });
  } catch (error) {
    logger.error('Error bulk deleting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notifications',
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Obtenir le nombre de notifications non lues
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
    });
  }
};

/**
 * Internal: Créer et envoyer une notification
 */
exports.sendNotification = async (notificationData) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      category,
      channels = { inApp: true },
      data = {},
      priority = 'medium',
    } = notificationData;

    // Sauvegarder la notification en base de données
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      category,
      channels,
      data,
      priority,
    });

    await notification.save();

    // Envoyer les notifications via les canaux configurés
    if (channels.email && notificationData.userEmail) {
      await sendNotificationEmail(notification, notificationData);
    }

    if (channels.sms && notificationData.phoneNumber) {
      await sendNotificationSMS(notification, notificationData);
    }

    if (channels.push && notificationData.pushToken) {
      // À implémenter avec Firebase ou similaire
    }

    logger.info(`Notification sent: ${notification._id}`);
    return notification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Envoyer une notification par email basée sur le type
 */
const sendNotificationEmail = async (notification, data) => {
  try {
    switch (notification.type) {
      case 'user_created':
        await sendUserConfirmationEmail({
          email: data.userEmail,
          name: data.userName,
          confirmLink: data.confirmLink,
        });
        break;

      case 'booking_request':
        await sendNewReservationRequestEmail({
          hostEmail: data.hostEmail,
          hostName: data.hostName,
          guestName: data.guestName,
          listingTitle: data.listingTitle,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          totalPrice: data.totalPrice,
          conversationId: data.conversationId,
        });
        break;

      case 'booking_confirmed':
        await sendReservationConfirmedEmail({
          guestEmail: data.guestEmail,
          guestName: data.guestName,
          hostName: data.hostName,
          listingTitle: data.listingTitle,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          totalPrice: data.totalPrice,
          reservationId: data.reservationId,
        });
        break;

      case 'booking_cancelled':
        await sendReservationCancelledEmail({
          guestEmail: data.guestEmail,
          guestName: data.guestName,
          hostName: data.hostName,
          listingTitle: data.listingTitle,
          reason: data.reason,
        });
        break;

      case 'payment_failed':
        await sendPaymentFailedEmail({
          userEmail: data.userEmail,
          userName: data.userName,
          reason: data.reason,
          reservationId: data.reservationId,
        });
        break;

      case 'refund_processed':
        await sendRefundConfirmationEmail({
          userEmail: data.userEmail,
          userName: data.userName,
          refundAmount: data.refundAmount,
        });
        break;

      case 'new_message':
        await sendNewMessageEmail({
          to: data.userEmail,
          recipientName: data.recipientName,
          senderName: data.senderName,
          messagePreview: data.messagePreview,
          conversationId: data.conversationId,
        });
        break;

      case 'review_received':
        await sendReviewReceivedEmail({
          userEmail: data.userEmail,
          userName: data.userName,
          reviewerName: data.reviewerName,
          rating: data.rating,
          comment: data.comment,
          reviewLink: data.reviewLink,
        });
        break;

      default:
        logger.warn(`No email template for notification type: ${notification.type}`);
    }

    // Mettre à jour le statut d'envoi
    await Notification.updateOne(
      { _id: notification._id },
      { 'sentStatus.email': { sent: true, sentAt: new Date() } }
    );
  } catch (error) {
    logger.error(`Error sending email notification:`, error);
    await Notification.updateOne(
      { _id: notification._id },
      {
        'sentStatus.email': {
          sent: false,
          error: error.message,
        },
      }
    );
  }
};

/**
 * Envoyer une notification par SMS basée sur le type
 */
const sendNotificationSMS = async (notification, data) => {
  try {
    switch (notification.type) {
      case 'verification':
        await sendVerificationCodeSMS({
          phoneNumber: data.phoneNumber,
          code: data.verificationCode,
        });
        break;

      case 'booking_confirmed':
        await sendReservationConfirmationSMS({
          phoneNumber: data.phoneNumber,
          guestName: data.guestName,
          listingTitle: data.listingTitle,
          checkIn: data.checkIn,
        });
        break;

      case 'check_in_reminder':
        await sendCheckInReminderSMS({
          phoneNumber: data.phoneNumber,
          guestName: data.guestName,
          listingTitle: data.listingTitle,
          checkInTime: data.checkInTime,
        });
        break;

      case 'new_message':
        await sendNewMessageSMS({
          phoneNumber: data.phoneNumber,
          recipientName: data.recipientName,
          senderName: data.senderName,
        });
        break;

      case 'payment_failed':
        await sendPaymentFailedSMS({
          phoneNumber: data.phoneNumber,
          userName: data.userName,
        });
        break;

      default:
        logger.warn(`No SMS template for notification type: ${notification.type}`);
    }

    // Mettre à jour le statut d'envoi
    await Notification.updateOne(
      { _id: notification._id },
      { 'sentStatus.sms': { sent: true, sentAt: new Date() } }
    );
  } catch (error) {
    logger.error(`Error sending SMS notification:`, error);
    await Notification.updateOne(
      { _id: notification._id },
      {
        'sentStatus.sms': {
          sent: false,
          error: error.message,
        },
      }
    );
  }
};

module.exports = exports;
