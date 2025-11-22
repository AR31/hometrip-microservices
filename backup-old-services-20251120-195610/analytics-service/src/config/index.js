require('dotenv').config();

const config = {
  // Application
  app: {
    name: 'analytics-service',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || 4008),
    host: process.env.SERVICE_HOST || '0.0.0.0'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/analytics_db?authSource=admin'
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || 0)
  },

  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672'
  },

  // Consul Service Discovery
  consul: {
    host: process.env.CONSUL_HOST || 'consul',
    port: parseInt(process.env.CONSUL_PORT || 8500),
    enabled: process.env.CONSUL_ENABLED === 'true'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || 100)
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    credentials: true
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Analytics Configuration
  analytics: {
    aggregationInterval: parseInt(process.env.AGGREGATION_INTERVAL || 3600000), // 1 hour
    retentionDays: parseInt(process.env.RETENTION_DAYS || 730), // 2 years
    batchSize: parseInt(process.env.BATCH_SIZE || 100)
  }
};

// Validate required configuration in production
const validateConfig = () => {
  const required = ['JWT_SECRET'];

  if (config.app.env === 'production') {
    required.push('MONGODB_URI');
  }

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Only validate in production
if (config.app.env === 'production') {
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration Error:', error.message);
    process.exit(1);
  }
}

module.exports = config;
