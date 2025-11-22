const winston = require('winston');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Create logs directory if it doesn't exist
const logsDir = config.LOG_DIR;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'gray',
  },
};

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'payment-service' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (config.isDevelopment()) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ colors: customLevels.colors }),
        winston.format.printf(
          (info) =>
            `${info.timestamp} [${info.level}] ${info.message} ${
              Object.keys(info).length > 5 ? JSON.stringify(info) : ''
            }`
        )
      ),
    })
  );
}

// Helper methods
logger.logPaymentEvent = (event, data) => {
  logger.info(`Payment Event: ${event}`, { event, ...data });
};

logger.logWebhookEvent = (eventType, eventId, data) => {
  logger.info(`Webhook Event: ${eventType}`, { eventId, eventType, ...data });
};

logger.logError = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...context,
  });
};

module.exports = logger;
