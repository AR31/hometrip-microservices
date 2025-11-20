const logger = require("../utils/logger");

/**
 * Authentication middleware
 * Extracts user info from x-user-* headers (for API Gateway)
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Try to get user from x-user-* headers (from API Gateway)
    const userId = req.header("x-user-id");
    const userEmail = req.header("x-user-email");
    const userRole = req.header("x-user-role");

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise"
      });
    }

    // Attach user info to request
    req.user = {
      id: userId,
      email: userEmail,
      role: userRole || "user"
    };

    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur d'authentification"
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise"
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} to role-restricted route`);
      return res.status(403).json({
        success: false,
        message: "Accès refusé - Privilèges insuffisants"
      });
    }

    next();
  };
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
