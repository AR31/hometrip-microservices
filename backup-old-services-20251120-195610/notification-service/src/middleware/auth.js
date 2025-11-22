const logger = require('../utils/logger');

/**
 * Middleware d'authentification JWT
 * Extrait l'utilisateur du token Bearer ou des en-têtes personnalisés
 */
const auth = (req, res, next) => {
  try {
    // Vérifier le header Authorization
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // Alternatives de fallback
    if (!token) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      token = req.query.token;
    }

    // En développement, permettre l'accès avec un userId simple
    if (!token && process.env.NODE_ENV === 'development') {
      const userId = req.headers['x-user-id'] || req.query.userId;
      if (userId) {
        req.user = { id: userId };
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
    }

    try {
      // En production, vérifier le JWT
      // Pour l'instant, on utilise un décryptage simple pour le développement
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
    } catch (jwtError) {
      // En fallback, si le JWT échoue et qu'on a un format simple
      if (token.length > 20) {
        // Supposer que c'est un JWT
        logger.error('JWT verification failed:', jwtError.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      } else {
        // Supposer que c'est un ID simple (développement)
        req.user = { id: token };
        next();
      }
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Middleware optionnel d'authentification
 * Ne bloque pas si aucun token n'est fourni
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      token = req.headers['x-user-id'];
    }

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
      } catch (jwtError) {
        // Ignorer les erreurs JWT et continuer
        if (token.length < 20) {
          req.user = { id: token };
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continuer même en cas d'erreur
  }
};

/**
 * Middleware d'authentification pour les webhooks internes
 */
const webhookAuth = (req, res, next) => {
  try {
    const webhookSecret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      logger.warn('WEBHOOK_SECRET not configured, allowing all webhook requests');
      return next();
    }

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }

    next();
  } catch (error) {
    logger.error('Webhook auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  webhookAuth,
};
