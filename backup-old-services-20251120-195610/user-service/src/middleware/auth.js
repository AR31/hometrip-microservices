const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header or custom headers
 * Supports both Bearer token and custom headers (x-user-id, x-user-email, x-user-role)
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    let token = null;
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer '
    }

    // If no Bearer token, check for custom headers (for inter-service communication)
    if (!token) {
      const userId = req.header('x-user-id');
      const userEmail = req.header('x-user-email');
      const userRole = req.header('x-user-role');

      if (userId && userEmail) {
        // Trust the headers (these should come from API gateway or service mesh)
        req.user = {
          id: userId,
          email: userEmail,
          role: userRole || 'user'
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token requires 2FA
    if (decoded.requires2FA) {
      return res.status(403).json({
        success: false,
        message: 'Authentification à deux facteurs requise',
        requires2FA: true
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré',
        expired: true
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // Token is invalid, but we don't fail
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array<string>} roles - Allowed roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} to role-restricted route`);
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Privilèges insuffisants'
      });
    }

    next();
  };
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;
