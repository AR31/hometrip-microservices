const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Destinataire de la notification
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Expéditeur (optionnel, peut être le système)
    sender: {
      type: String,
    },

    // Type de notification
    type: {
      type: String,
      required: true,
      enum: [
        // Réservations
        'booking_request',
        'booking_confirmed',
        'booking_cancelled',
        'booking_modified',
        'booking_reminder',
        'booking_completed',
        'check_in_reminder',
        'check_out_reminder',

        // Paiements
        'payment_received',
        'payment_sent',
        'payment_failed',
        'refund_processed',
        'payout_sent',

        // Messages
        'new_message',
        'message_reply',

        // Évaluations
        'review_request',
        'review_received',
        'review_reminder',
        'review_response',

        // Annonces
        'listing_approved',
        'listing_rejected',
        'listing_expired',
        'listing_update_required',

        // Favoris
        'favorite_price_drop',
        'favorite_available',
        'favorite_booked',

        // Compte & Vérification
        'verification',
        'account_verified',
        'document_approved',
        'document_rejected',
        'identity_verification_required',
        'user_created',

        // Système
        'promotion',
        'system_update',
        'security_alert',
        'reminder',
      ],
      index: true,
    },

    // Titre de la notification
    title: {
      type: String,
      required: true,
    },

    // Message de la notification
    message: {
      type: String,
      required: true,
    },

    // Lien d'action
    link: String,

    // Données additionnelles
    data: {
      // ID de la réservation
      bookingId: String,

      // ID de l'annonce
      listingId: String,

      // ID du message
      messageId: String,

      // ID de l'évaluation
      reviewId: String,

      // Montant
      amount: Number,
      currency: String,

      // Image associée
      image: String,

      // Métadonnées flexibles
      metadata: mongoose.Schema.Types.Mixed,
    },

    // État de lecture
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Date de lecture
    readAt: Date,

    // Priorité
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Catégorie pour le filtrage
    category: {
      type: String,
      enum: [
        'booking',
        'payment',
        'message',
        'review',
        'listing',
        'account',
        'system',
      ],
      required: true,
      index: true,
      default: 'system',
    },

    // Canaux de notification
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },

    // Statut d'envoi
    sentStatus: {
      email: { sent: Boolean, sentAt: Date, error: String },
      push: { sent: Boolean, sentAt: Date, error: String },
      sms: { sent: Boolean, sentAt: Date, error: String },
    },

    // Archivée
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Date d'expiration (optionnelle)
    expiresAt: Date,
  },
  { timestamps: true }
);

// Index composés pour les performances
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Méthodes d'instance
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = async function () {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

notificationSchema.methods.archive = async function () {
  this.isArchived = true;
  return this.save();
};

// Méthodes statiques
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false,
  });
};

notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

notificationSchema.statics.deleteOldNotifications = async function (
  daysOld = 90
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isArchived: true,
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
