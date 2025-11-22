const logger = require('../utils/logger');

/**
 * Optional authentication middleware
 * Attempts to extract user info from token but doesn't fail if missing
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      // Decode token (simplified - in production, verify with secret)
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.user = decoded;
        req.userId = decoded.id || decoded.sub;
        logger.debug(`Authenticated user: ${req.userId}`);
      } catch (error) {
        logger.debug('Invalid token format, continuing as anonymous');
      }
    } else {
      logger.debug('No authentication token provided, continuing as anonymous');
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next();
  }
};

/**
 * Required authentication middleware
 * Fails if no valid token is provided
 */
const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      req.user = decoded;
      req.userId = decoded.id || decoded.sub;
      logger.debug(`Authenticated user: ${req.userId}`);
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

module.exports = {
  optionalAuth,
  requireAuth
};
