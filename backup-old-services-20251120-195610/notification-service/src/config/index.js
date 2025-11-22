require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 4009,
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || 'localhost',

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    'mongodb://localhost:27017/hometrip-notifications',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
  EMAIL_USER:
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_ADDRESS,
  EMAIL_PASSWORD:
    process.env.EMAIL_PASSWORD ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS,
  EMAIL_FROM:
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_USER,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true' || false,

  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Firebase Configuration (optionnel pour les push notifications)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,

  // RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3100',

  // Application
  APP_NAME: process.env.APP_NAME || 'HomeTrip',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@hometrip.com',

  // Webhook
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
};
