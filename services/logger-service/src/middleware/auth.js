const config = require('../config');
const logger = require('../utils/logger');

/**
 * API Key authentication middleware
 * Validates X-API-Key header
 */
function apiKeyAuth(req, res, next) {
  // Skip auth for health checks
  if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics') {
    return next();
  }

  const apiKey = req.headers[config.API_KEY_HEADER];

  if (!apiKey) {
    logger.warn(`Missing API key for ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      message: `Missing required header: ${config.API_KEY_HEADER}`
    });
  }

  if (!config.VALID_API_KEYS.includes(apiKey)) {
    logger.warn(`Invalid API key attempt for ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  // Store API key info for logging
  req.apiKey = apiKey;
  next();
}

/**
 * Role-based access control
 * Currently allows all authenticated users
 */
function authorize(requiredRoles = []) {
  return (req, res, next) => {
    // For now, just check authentication
    // This can be extended with role-based logic later
    next();
  };
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      service: 'logger-service'
    });
  });

  next();
}

module.exports = {
  apiKeyAuth,
  authorize,
  requestLogger
};
