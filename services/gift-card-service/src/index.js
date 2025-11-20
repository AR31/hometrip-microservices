const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const connectDB = require('./config/database');
const swaggerSpec = require('./config/swagger');
const eventBus = require('./utils/eventBus');
const logger = require('./utils/logger');

const giftCardsRoutes = require('./routes/giftCards');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(config.nodeEnv === 'development' ? morgan('dev') : morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: config.serviceName,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1;
    const rabbitMQStatus = eventBus.channel !== null;

    if (dbStatus && rabbitMQStatus) {
      res.status(200).json({ success: true, database: 'connected', rabbitmq: 'connected' });
    } else {
      res.status(503).json({
        success: false,
        database: dbStatus ? 'connected' : 'disconnected',
        rabbitmq: rabbitMQStatus ? 'connected' : 'disconnected',
      });
    }
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/gift-cards', giftCardsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await eventBus.connect();

    await eventBus.subscribe('payment.succeeded', async (event) => {
      logger.info('Received payment.succeeded event:', event);
      // Handle gift card payment completion
    });

    const server = app.listen(config.port, () => {
      logger.info(`✅ ${config.serviceName} running on port ${config.port}`);
      logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Closing server gracefully...`);
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        await eventBus.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();

module.exports = app;
