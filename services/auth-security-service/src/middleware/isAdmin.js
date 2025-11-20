/**
 * Middleware to check if user has admin role
 * Must be used after auth middleware
 */
const isAdmin = (req, res, next) => {
  try {
    // Check if user exists (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé - Authentification requise"
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Accès refusé - Droits administrateur requis"
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = isAdmin;
