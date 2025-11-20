require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/logs_db',

  // Elasticsearch
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'hometrip-logs',

  // RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE || 'hometrip-logs',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Log Retention
  LOG_RETENTION_DAYS: {
    error: parseInt(process.env.ERROR_RETENTION_DAYS || '90'),    // 3 months
    warn: parseInt(process.env.WARN_RETENTION_DAYS || '60'),      // 2 months
    info: parseInt(process.env.INFO_RETENTION_DAYS || '30'),      // 1 month
    debug: parseInt(process.env.DEBUG_RETENTION_DAYS || '7'),     // 1 week
    verbose: parseInt(process.env.VERBOSE_RETENTION_DAYS || '3')  // 3 days
  },

  // API Authentication
  API_KEY_HEADER: process.env.API_KEY_HEADER || 'x-api-key',
  VALID_API_KEYS: (process.env.VALID_API_KEYS || 'logger-service-key').split(','),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),    // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests

  // Batch Processing
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '100'),
  BATCH_TIMEOUT_MS: parseInt(process.env.BATCH_TIMEOUT_MS || '5000'),

  // Health Check
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000') // 30 seconds
};
