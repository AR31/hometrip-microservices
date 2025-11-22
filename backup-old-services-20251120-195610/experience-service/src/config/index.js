require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4011,
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'experience-service',

  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/experience_db',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  consul: {
    host: process.env.CONSUL_HOST || 'localhost',
    port: process.env.CONSUL_PORT || 8500,
  },

  services: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:4002',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4009',
  },
};
