const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const auth = (req, res, next) => {
  try {
    // Get user ID from header (set by API Gateway)
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRole = req.headers['x-user-role'];

    if (userId) {
      req.user = {
        id: userId,
        email: userEmail,
        role: userRole,
      };
      return next();
    }

    // Fallback: Check for JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRole = req.headers['x-user-role'];

    if (userId) {
      req.user = {
        id: userId,
        email: userEmail,
        role: userRole,
      };
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const isHost = (req, res, next) => {
  if (req.user && (req.user.role === 'host' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Host role required.' });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Admin role required.' });
};

module.exports = { auth, optionalAuth, isHost, isAdmin };
