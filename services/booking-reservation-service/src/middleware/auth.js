const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

/**
 * Verify JWT token and attach user info to request
 */
const auth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    // Attach user to request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch (error) {
    logger.warn("Optional auth error:", error.message);
  }

  next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
