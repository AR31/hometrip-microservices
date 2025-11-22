// SMS service stub - implement with Twilio or similar
const logger = require('../utils/logger');

// Placeholder SMS functions
const sendVerificationCodeSMS = async (data) => {
  logger.info('SMS: Verification code (not implemented)', data);
  return Promise.resolve();
};

const sendReservationConfirmationSMS = async (data) => {
  logger.info('SMS: Reservation confirmation (not implemented)', data);
  return Promise.resolve();
};

const sendCheckInReminderSMS = async (data) => {
  logger.info('SMS: Check-in reminder (not implemented)', data);
  return Promise.resolve();
};

const sendNewMessageSMS = async (data) => {
  logger.info('SMS: New message (not implemented)', data);
  return Promise.resolve();
};

const sendPaymentFailedSMS = async (data) => {
  logger.info('SMS: Payment failed (not implemented)', data);
  return Promise.resolve();
};

module.exports = {
  sendVerificationCodeSMS,
  sendReservationConfirmationSMS,
  sendCheckInReminderSMS,
  sendNewMessageSMS,
  sendPaymentFailedSMS
};
