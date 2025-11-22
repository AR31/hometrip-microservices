const jwt = require("jwt-decode");
const logger = require("../utils/logger");

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided"
      });
    }

    const decoded = jwt(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: "Invalid token"
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }
};

module.exports = auth;
