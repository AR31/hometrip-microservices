require("dotenv").config();

module.exports = {
  // Application
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4004,
  SERVICE_HOST: process.env.SERVICE_HOST || "0.0.0.0",
  SERVICE_VERSION: process.env.SERVICE_VERSION || "1.0.0",

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/booking_db",

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: process.env.REDIS_DB || 0,

  // RabbitMQ
  RABBITMQ_URL:
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",

  // Consul Service Discovery
  CONSUL_HOST: process.env.CONSUL_HOST || "localhost",
  CONSUL_PORT: process.env.CONSUL_PORT || 8500,
  CONSUL_ENABLED: process.env.CONSUL_ENABLED === "true",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 900000,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",

  // Service URLs
  LISTING_SERVICE_URL: process.env.LISTING_SERVICE_URL || "http://localhost:4003",
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || "http://localhost:4005",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:4002",
  NOTIFICATION_SERVICE_URL:
    process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4007",
  COUPON_SERVICE_URL: process.env.COUPON_SERVICE_URL || "http://localhost:4008"
};
