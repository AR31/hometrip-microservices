const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 4006,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/hometrip-messages",
  rabbitmqUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  logLevel: process.env.LOG_LEVEL || "info",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  corsOrigin: process.env.CORS_ORIGIN || ["http://localhost:3000", "http://localhost:3001"],
  apiGatewayUrl: process.env.API_GATEWAY_URL || "http://localhost:4000"
};
