require('dotenv').config();

const config = {
  // Application
  app: {
    name: 'websocket-gateway',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || 3002),
    host: process.env.SERVICE_HOST || '0.0.0.0'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    algorithms: ['HS256']
  },

  // Redis Configuration (for socket adapter)
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || 1),
    keyPrefix: 'ws:',
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },

  // Socket.io Configuration
  socketio: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'https://hometrip.com',
        'https://www.hometrip.com'
      ],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true
  },

  // RabbitMQ Configuration
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'rabbitmq',
    port: parseInt(process.env.RABBITMQ_PORT || 5672),
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    vhost: process.env.RABBITMQ_VHOST || '/',
    exchange: 'hometrip_events',
    queues: {
      messageSent: 'websocket.message.sent',
      bookingConfirmed: 'websocket.booking.confirmed',
      notificationCreated: 'websocket.notification.created'
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    dir: process.env.LOG_DIR || 'logs'
  },

  // Health Check
  healthCheck: {
    path: '/health',
    interval: 10000, // 10 seconds
    timeout: 5000
  },

  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    path: '/metrics'
  },

  // Room Configuration
  rooms: {
    userPrefix: 'user:',
    conversationPrefix: 'conversation:',
    notificationPrefix: 'notification:',
    presencePrefix: 'presence:'
  },

  // Security
  security: {
    allowAuthWithoutJWT: process.env.ALLOW_AUTH_WITHOUT_JWT === 'true' ? true : false,
    tokenExpiryCheck: true
  },

  // Services URLs
  services: {
    message: {
      url: process.env.MESSAGE_SERVICE_URL || 'http://message-service:4006',
      timeout: 5000
    },
    notification: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4009',
      timeout: 5000
    },
    booking: {
      url: process.env.BOOKING_SERVICE_URL || 'http://booking-service:4004',
      timeout: 5000
    }
  }
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'JWT_SECRET'
  ];

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
