const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/database');
const eventBus = require('./utils/eventBus');

// Import routes
const authRoutes = require('./routes/auth');

// Create Express app

// Swagger Documentation
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const app = express();

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS
app.use(compression()); // Compress responses

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: config.app.name,
    version: config.app.version,
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  // Check if all dependencies are ready
  const ready = eventBus.connected;

  if (ready) {
    res.json({
      status: 'ready',
      service: config.app.name
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      service: config.app.name
    });
  }
});

// Metrics endpoint (basic)
app.get('/metrics', (req, res) => {
  res.json({
    service: config.app.name,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/auth', authRoutes);


// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: Interactive API documentation using Swagger UI
 *     tags: [Documentation]
 */
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(config.app.env === 'development' && { stack: err.stack })
  });
});

// Initialize service
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to RabbitMQ
    await eventBus.connect();

    // Start server
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Auth Service running on ${config.app.host}:${config.app.port}`);
      logger.info(`Environment: ${config.app.env}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await disconnectDB();

          // Close RabbitMQ connection
          await eventBus.close();

          logger.info('All connections closed. Exiting...');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
