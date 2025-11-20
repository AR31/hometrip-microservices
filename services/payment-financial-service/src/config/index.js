require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 4005,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hometrip_payment',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,

  // Service URLs
  BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:4004',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:4002',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006',
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4007',

  // Event Bus
  EVENT_BUS_URL: process.env.EVENT_BUS_URL || 'http://localhost:5000',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',

  // Email Service
  EMAIL_SERVICE_URL: process.env.EMAIL_SERVICE_URL || 'http://localhost:4006/api/emails',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',

  // Feature Flags
  ENABLE_WEBHOOKS: process.env.ENABLE_WEBHOOKS !== 'false',
  ENABLE_STRIPE_CONNECT: process.env.ENABLE_STRIPE_CONNECT !== 'false',
  ENABLE_REFUNDS: process.env.ENABLE_REFUNDS !== 'false',

  // Environment checks
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test',
};
