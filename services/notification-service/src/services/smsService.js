const twilio = require('twilio');
const logger = require('../utils/logger');

let twilioClient;

const initializeTwilio = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio credentials not configured. SMS service disabled.');
    return null;
  }

  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  logger.info('Twilio SMS service initialized');
  return twilioClient;
};

/**
 * Fonction générique pour envoyer un SMS
 */
const sendSMS = async ({ to, body }) => {
  try {
    if (!twilioClient) {
      initializeTwilio();
    }

    if (!twilioClient) {
      return {
        success: false,
        error: 'Twilio client not initialized',
      };
    }

    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    logger.info(`SMS sent to ${to}:`, message.sid);
    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    logger.error('SMS send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * SMS: Confirmation de code
 */
const sendVerificationCodeSMS = async ({ phoneNumber, code }) => {
  const body = `Votre code de vérification HomeTrip est: ${code}. Valable 10 minutes.`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Confirmation de réservation
 */
const sendReservationConfirmationSMS = async ({
  phoneNumber,
  guestName,
  listingTitle,
  checkIn,
}) => {
  const checkInDate = new Date(checkIn).toLocaleDateString('fr-FR');
  const body = `Réservation confirmée! ${guestName}, vous êtes réservé(e) pour ${listingTitle} à partir du ${checkInDate}. Merci de votre confiance HomeTrip!`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Rappel d'arrivée
 */
const sendCheckInReminderSMS = async ({
  phoneNumber,
  guestName,
  listingTitle,
  checkInTime,
}) => {
  const body = `${guestName}, rappel! Vous arrivez aujourd'hui à ${listingTitle} à partir de ${checkInTime}. Avez-vous des questions? Contactez votre hôte via HomeTrip.`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Rappel de départ
 */
const sendCheckOutReminderSMS = async ({ phoneNumber, guestName, checkOutTime }) => {
  const body = `${guestName}, rappel de départ demain à ${checkOutTime}. N'oubliez pas de laisser un avis après votre séjour. Merci!`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Nouveau message
 */
const sendNewMessageSMS = async ({
  phoneNumber,
  recipientName,
  senderName,
}) => {
  const body = `${recipientName}, ${senderName} vous a envoyé un message via HomeTrip. Allez lire votre message!`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Paiement échoué
 */
const sendPaymentFailedSMS = async ({ phoneNumber, userName }) => {
  const body = `${userName}, votre paiement a échoué. Veuillez réessayer ou contactez le support HomeTrip.`;
  return sendSMS({ to: phoneNumber, body });
};

/**
 * SMS: Demande de réservation reçue
 */
const sendBookingRequestSMS = async ({
  phoneNumber,
  hostName,
  guestName,
  listingTitle,
}) => {
  const body = `${hostName}, ${guestName} a fait une demande de réservation pour ${listingTitle}. Consultez HomeTrip pour répondre.`;
  return sendSMS({ to: phoneNumber, body });
};

module.exports = {
  initializeTwilio,
  sendSMS,
  sendVerificationCodeSMS,
  sendReservationConfirmationSMS,
  sendCheckInReminderSMS,
  sendCheckOutReminderSMS,
  sendNewMessageSMS,
  sendPaymentFailedSMS,
  sendBookingRequestSMS,
};
