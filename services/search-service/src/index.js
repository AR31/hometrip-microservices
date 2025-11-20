const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/database');
const { initElasticsearch, closeElasticsearch } = require('./config/elasticsearch');
const eventBus = require('./utils/eventBus');
const elasticsearchService = require('./services/elasticsearchService');

// Import routes
const searchRoutes = require('./routes/search');

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
app.use('/search', searchRoutes);


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

/**
 * Initialize event subscriptions
 */
const initializeEventSubscriptions = async () => {
  try {
    // Subscribe to listing.created event
    await eventBus.subscribe('listing.created', async (data) => {
      try {
        logger.info('Received listing.created event:', data._id);
        await elasticsearchService.indexDocument(data._id, {
          id: data._id.toString(),
          title: data.title,
          description: data.description,
          location: data.location,
          city: data.address?.city,
          country: data.address?.country,
          address: `${data.address?.street} ${data.address?.city}`,
          lat: data.lat,
          lng: data.lng,
          price: data.price,
          guests: data.guests,
          bedrooms: data.bedrooms,
          beds: data.beds,
          bathrooms: data.bathrooms,
          structure: data.structure,
          propertyType: data.propertyType,
          amenities: data.amenities || [],
          hostId: data.host?.toString() || data.hostId?.toString(),
          isActive: data.isActive !== false,
          averageRating: data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          petsAllowed: data.petsAllowed || false,
          instantBooking: data.instantBooking || false,
          selfCheckIn: data.selfCheckIn || false,
          freeParking: data.freeParking || false,
          topRated: data.topRated || false,
          houseRules: data.houseRules || {},
          discounts: data.discounts || {},
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      } catch (error) {
        logger.error('Error indexing created listing:', error);
      }
    });

    // Subscribe to listing.updated event
    await eventBus.subscribe('listing.updated', async (data) => {
      try {
        logger.info('Received listing.updated event:', data._id);
        await elasticsearchService.updateDocument(data._id, {
          title: data.title,
          description: data.description,
          location: data.location,
          city: data.address?.city,
          country: data.address?.country,
          address: `${data.address?.street} ${data.address?.city}`,
          price: data.price,
          guests: data.guests,
          bedrooms: data.bedrooms,
          beds: data.beds,
          bathrooms: data.bathrooms,
          amenities: data.amenities || [],
          isActive: data.isActive !== false,
          averageRating: data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          petsAllowed: data.petsAllowed || false,
          instantBooking: data.instantBooking || false,
          selfCheckIn: data.selfCheckIn || false,
          freeParking: data.freeParking || false,
          topRated: data.topRated || false,
          updatedAt: data.updatedAt
        });
      } catch (error) {
        logger.error('Error updating indexed listing:', error);
      }
    });

    // Subscribe to listing.deleted event
    await eventBus.subscribe('listing.deleted', async (data) => {
      try {
        logger.info('Received listing.deleted event:', data._id || data.id);
        await elasticsearchService.deleteDocument(data._id || data.id);
      } catch (error) {
        logger.error('Error deleting indexed listing:', error);
      }
    });

    logger.info('Event subscriptions initialized');
  } catch (error) {
    logger.error('Error initializing event subscriptions:', error);
  }
};

// Initialize service
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Elasticsearch
    const esClient = await initElasticsearch();

    // Initialize Elasticsearch index (only if Elasticsearch is connected)
    if (esClient) {
      await elasticsearchService.initializeIndex();
    } else {
      logger.warn('Skipping Elasticsearch index initialization (Elasticsearch not connected)');
    }

    // Connect to RabbitMQ
    await eventBus.connect();

    // Initialize event subscriptions
    await initializeEventSubscriptions();

    // Start server
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info(`Server running on ${config.app.host}:${config.app.port}`);
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

          // Close Elasticsearch connection
          await closeElasticsearch();

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
