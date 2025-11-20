const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Socket.io middleware for JWT authentication
 * Verifies JWT token on connection and attachment
 */
const socketAuth = (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token ||
                  socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token && !config.security.allowAuthWithoutJWT) {
      logger.warn('Connection attempt without JWT token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication error: No token provided'));
    }

    if (token) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret, {
          algorithms: config.jwt.algorithms
        });

        // Attach user information to socket
        socket.userId = decoded.id || decoded.userId || decoded.sub;
        socket.userEmail = decoded.email;
        socket.userRole = decoded.role;
        socket.token = token;

        // Check if token is expiring soon (within 5 minutes)
        const expiresIn = decoded.exp ? (decoded.exp * 1000 - Date.now()) / 1000 : null;
        if (expiresIn && expiresIn < 300) {
          logger.warn('Token expiring soon', {
            userId: socket.userId,
            expiresIn: Math.ceil(expiresIn)
          });
          socket.emit('token_expiring_soon', {
            expiresIn: Math.ceil(expiresIn)
          });
        }

        logger.info('Socket authenticated', {
          socketId: socket.id,
          userId: socket.userId,
          email: socket.userEmail
        });

        next();
      } catch (error) {
        logger.error('JWT verification failed', {
          socketId: socket.id,
          error: error.message
        });
        next(new Error(`Authentication error: ${error.message}`));
      }
    } else {
      // Allow connection without authentication if configured
      socket.userId = null;
      socket.userEmail = null;
      socket.userRole = null;
      next();
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      socketId: socket.id,
      error: error.message
    });
    next(new Error('Internal authentication error'));
  }
};

module.exports = socketAuth;
