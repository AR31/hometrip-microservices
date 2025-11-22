const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const config = require('./config');
const { connectDB, getConnectionStatus } = require('./config/database');
const { connect, subscribe, disconnect } = require('./utils/eventBus');
const { initializeTransporter } = require('./services/emailService');
const { initializeTwilio } = require('./services/smsService');
const notificationRoutes = require('./routes/notifications');


// Swagger Documentation
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const app = express();

// ============ Configuration ============

// Middleware de sécurité
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// ============ Routes ============

// Health Check
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  const status = dbStatus.connected ? 200 : 503;
  res.status(status).json({
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: config.NODE_ENV,
  });
});

// Metrics
app.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    environment: config.NODE_ENV,
  });
});

// Notification Routes
app.use('/api/notifications', notificationRoutes);

// Ready endpoint for Kubernetes
app.get('/ready', async (req, res) => {
  const dbStatus = getConnectionStatus();
  if (dbStatus.connected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============ Initialization ============

let server;

const initializeServices = async () => {
  try {
    logger.info('Initializing Notification Service...');

    // Connecter à MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // Initialiser le service d'email
    logger.info('Initializing email service...');
    initializeTransporter();

    // Initialiser Twilio
    logger.info('Initializing Twilio SMS service...');
    initializeTwilio();

    // Connecter à RabbitMQ et s'abonner aux événements
    logger.info('Connecting to RabbitMQ...');
    await connect();
    await subscribe();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization error:', error);
    // Continuer même si une initialisation échoue
  }
};

const startServer = async () => {
  try {
    // Initialiser les services
    await initializeServices();

    // Démarrer le serveur
    server = app.listen(config.PORT, config.HOST, () => {
      logger.info(
        `Notification Service running on http://${config.HOST}:${config.PORT}`
      );
      logger.info(`Environment: ${config.NODE_ENV}`);
    });

    // Graceful Shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.logUncaughtError(error);
      gracefulShutdown();
    });

    // Promesses rejetées non gérées
    process.on('unhandledRejection', (reason, promise) => {
      logger.logUnhandledRejection(reason, promise);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');

  if (server) {
    server.close(async () => {
      logger.info('Server closed');

      try {
        // Fermer les connexions
        await disconnect(); // RabbitMQ
        // MongoDB se ferme automatiquement

        logger.info('Notification Service shut down successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown après 30 secondes
    setTimeout(() => {
      logger.error('Forced shutdown - timeout exceeded');
      process.exit(1);
    }, 30000);
  }
};

// Démarrer le serveur
startServer();

module.exports = app;
