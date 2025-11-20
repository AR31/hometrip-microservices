#!/bin/bash

# Script to generate a microservice structure
# Usage: ./generate-service.sh <service-name> <port>

SERVICE_NAME=$1
PORT=$2
BASE_DIR="/home/arwa/hometrip-microservices/services/$SERVICE_NAME"

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
    echo "Usage: ./generate-service.sh <service-name> <port>"
    exit 1
fi

echo "🚀 Generating $SERVICE_NAME on port $PORT..."

# Create directories if they don't exist
mkdir -p "$BASE_DIR"/{src/{controllers,models,routes,middleware,utils,config},tests,logs}

# Generate package.json
cat > "$BASE_DIR/package.json" <<EOF
{
  "name": "$SERVICE_NAME",
  "version": "1.0.0",
  "description": "$SERVICE_NAME microservice for HomeTrip",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "keywords": ["microservice", "hometrip"],
  "author": "HomeTrip Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.1",
    "express-rate-limit": "^7.1.1",
    "amqplib": "^0.10.3",
    "winston": "^3.11.0",
    "consul": "^1.2.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
EOF

# Generate .env.example
cat > "$BASE_DIR/.env.example" <<EOF
# Application
NODE_ENV=development
PORT=$PORT
SERVICE_HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/${SERVICE_NAME//-/_}_db?authSource=admin

# RabbitMQ
RABBITMQ_URL=amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672

# Consul
CONSUL_HOST=consul
CONSUL_PORT=8500

# Logging
LOG_LEVEL=info
EOF

# Generate Dockerfile
cat > "$BASE_DIR/Dockerfile" <<EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN mkdir -p logs

RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001 && \\
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:$PORT/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
EOF

# Generate .dockerignore
cat > "$BASE_DIR/.dockerignore" <<EOF
node_modules
npm-debug.log
.env
.env.*
!.env.example
logs
*.log
.git
.gitignore
*.md
tests
.DS_Store
coverage
EOF

# Generate logger utility
cat > "$BASE_DIR/src/utils/logger.js" <<'EOF'
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = \`\${timestamp} [\${level}]: \${message}\`;
    if (Object.keys(metadata).length > 0) {
      msg += \` \${JSON.stringify(metadata)}\`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || 'service' },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  exitOnError: false
});

logger.stream = {
  write: (message) => logger.info(message.trim())
};

module.exports = logger;
EOF

# Generate eventBus utility
cat > "$BASE_DIR/src/utils/eventBus.js" <<'EOF'
const amqp = require('amqplib');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'hometrip_events';
    this.connected = false;
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.connected = true;
      logger.info('Connected to RabbitMQ');

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.connected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connected = false;
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.connected = false;
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publish(eventName, data) {
    if (!this.connected || !this.channel) {
      logger.warn(\`Cannot publish event \${eventName}: Not connected\`);
      return;
    }

    try {
      const message = JSON.stringify({
        eventName,
        data,
        timestamp: new Date(),
        service: process.env.SERVICE_NAME || 'service'
      });

      this.channel.publish(this.exchange, eventName, Buffer.from(message), { persistent: true });
      logger.debug(\`Published event: \${eventName}\`);
    } catch (error) {
      logger.error(\`Failed to publish event \${eventName}:\`, error);
    }
  }

  async subscribe(eventName, handler) {
    if (!this.connected || !this.channel) {
      logger.warn(\`Cannot subscribe to event \${eventName}: Not connected\`);
      return;
    }

    try {
      const serviceName = process.env.SERVICE_NAME || 'service';
      const queueName = \`\${serviceName}.\${eventName}\`;
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, this.exchange, eventName);

      this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug(\`Received event: \${eventName}\`);
            await handler(content.data);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(\`Error handling event \${eventName}:\`, error);
            this.channel.nack(msg, false, true);
          }
        }
      });

      logger.info(\`Subscribed to event: \${eventName}\`);
    } catch (error) {
      logger.error(\`Failed to subscribe to event \${eventName}:\`, error);
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.connected = false;
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
EOF

# Generate database config
cat > "$BASE_DIR/src/config/database.js" <<'EOF'
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Connected to MongoDB');

    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

module.exports = { connectDB, disconnectDB };
EOF

# Generate config index
cat > "$BASE_DIR/src/config/index.js" <<EOF
require('dotenv').config();

const config = {
  app: {
    name: '$SERVICE_NAME',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || $PORT),
    host: process.env.SERVICE_HOST || '0.0.0.0'
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://hometrip:hometrip_rabbitmq_pass@rabbitmq:5672'
  },
  consul: {
    host: process.env.CONSUL_HOST || 'consul',
    port: parseInt(process.env.CONSUL_PORT || 8500),
    enabled: process.env.CONSUL_ENABLED === 'true'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
EOF

echo "✅ Service $SERVICE_NAME generated successfully!"
echo "📁 Location: $BASE_DIR"
echo "🔧 Next steps:"
echo "   1. cd $BASE_DIR"
echo "   2. Add your models, controllers, and routes"
echo "   3. Create src/index.js main application file"
echo "   4. npm install"
