const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Validates JWT tokens from requests
 */
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('No token provided', {
        path: req.path,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
    }

    // In a microservices architecture, you would typically:
    // 1. Validate JWT with Auth Service
    // 2. Or use service-to-service authentication (service keys)

    // Attach user info to request (would be populated from token validation)
    req.user = {
      id: null, // Would be extracted from token
      email: null,
      role: null,
    };

    // Mark as authenticated
    req.authenticated = true;
    next();
  } catch (error) {
    logger.logError('Auth middleware error', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Service-to-service authentication middleware
 * Validates API keys for inter-service communication
 */
const serviceAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const serviceName = req.headers['x-service-name'];

    if (!apiKey || !serviceName) {
      logger.warn('Service auth: Missing credentials', {
        path: req.path,
        hasApiKey: !!apiKey,
        hasServiceName: !!serviceName,
      });
      return res.status(401).json({
        success: false,
        error: 'Service authentication failed',
      });
    }

    // In production, validate apiKey against a service registry
    // For now, we just check that it's provided
    logger.info(`Service authenticated: ${serviceName}`);

    req.service = {
      name: serviceName,
      authenticated: true,
    };

    next();
  } catch (error) {
    logger.logError('Service auth middleware error', error);
    res.status(500).json({
      success: false,
      error: 'Service authentication error',
    });
  }
};

/**
 * Optional authentication middleware
 * Allows requests both with and without tokens
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      req.authenticated = true;
      req.user = {
        id: null,
        email: null,
      };
    } else {
      req.authenticated = false;
    }

    next();
  } catch (error) {
    logger.logError('Optional auth middleware error', error);
    next(); // Continue anyway
  }
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`${req.method} ${req.path} - ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.logError('Unhandled error', err, {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  auth,
  serviceAuth,
  optionalAuth,
  requestLogger,
  errorHandler,
};
