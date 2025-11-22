// Email service stub - implement with your email provider
const logger = require('../utils/logger');

// Placeholder email functions
const sendUserConfirmationEmail = async (data) => {
  logger.info('Email: User confirmation (not implemented)', data);
  return Promise.resolve();
};

const sendNewReservationRequestEmail = async (data) => {
  logger.info('Email: New reservation request (not implemented)', data);
  return Promise.resolve();
};

const sendReservationConfirmedEmail = async (data) => {
  logger.info('Email: Reservation confirmed (not implemented)', data);
  return Promise.resolve();
};

const sendReservationCancelledEmail = async (data) => {
  logger.info('Email: Reservation cancelled (not implemented)', data);
  return Promise.resolve();
};

const sendPaymentFailedEmail = async (data) => {
  logger.info('Email: Payment failed (not implemented)', data);
  return Promise.resolve();
};

const sendRefundConfirmationEmail = async (data) => {
  logger.info('Email: Refund confirmation (not implemented)', data);
  return Promise.resolve();
};

const sendNewMessageEmail = async (data) => {
  logger.info('Email: New message (not implemented)', data);
  return Promise.resolve();
};

const sendReviewReceivedEmail = async (data) => {
  logger.info('Email: Review received (not implemented)', data);
  return Promise.resolve();
};

module.exports = {
  sendUserConfirmationEmail,
  sendNewReservationRequestEmail,
  sendReservationConfirmedEmail,
  sendReservationCancelledEmail,
  sendPaymentFailedEmail,
  sendRefundConfirmationEmail,
  sendNewMessageEmail,
  sendReviewReceivedEmail
};
