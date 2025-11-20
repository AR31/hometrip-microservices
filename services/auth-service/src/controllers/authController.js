const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const eventBus = require("../utils/eventBus");

/**
 * Register a new user
 * POST /auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const { email, fullName, password, role } = req.body;

    // Validation
    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont requis"
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format d'email invalide"
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères"
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé"
      });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer l'utilisateur
    const user = new User({
      email: email.toLowerCase(),
      fullName,
      password: hashedPassword,
      role: role || "guest",
      lastPasswordChange: new Date()
    });

    await user.save();

    logger.info(`New user registered: ${user.email}`);

    // Publish event to RabbitMQ for other services
    await eventBus.publish('user.created', {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt
    });

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Error in signup:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};

/**
 * Login user
 * POST /auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    logger.info(`Login attempt for: ${email}`);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis"
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logger.warn(`Login failed: User not found - ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect"
      });
    }

    // Check account status
    if (user.accountStatus.isBanned) {
      logger.warn(`Login blocked: User banned - ${email}`);
      return res.status(403).json({
        success: false,
        message: `Compte banni. Raison: ${user.accountStatus.banReason || 'Non spécifiée'}`
      });
    }

    if (user.accountStatus.isSuspended) {
      const now = new Date();
      if (user.accountStatus.suspendedUntil && user.accountStatus.suspendedUntil > now) {
        logger.warn(`Login blocked: User suspended - ${email}`);
        return res.status(403).json({
          success: false,
          message: `Compte suspendu jusqu'au ${user.accountStatus.suspendedUntil.toLocaleDateString()}`
        });
      } else {
        // Suspension expired, reactivate account
        user.accountStatus.isSuspended = false;
        user.accountStatus.suspendedUntil = null;
        await user.save();
      }
    }

    if (!user.accountStatus.isActive) {
      logger.warn(`Login blocked: Account inactive - ${email}`);
      return res.status(403).json({
        success: false,
        message: "Compte inactif"
      });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login failed: Invalid password - ${email}`);
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect"
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorAuth.enabled) {
      // Generate temporary token for 2FA verification
      const tempToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          requires2FA: true
        },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );

      return res.json({
        success: true,
        requires2FA: true,
        tempToken,
        method: user.twoFactorAuth.method
      });
    }

    // Update device info if provided
    if (deviceInfo) {
      user.devices.push({
        ...deviceInfo,
        ipAddress: req.ip,
        lastActive: new Date()
      });
      await user.save();
    }

    // Créer le token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    logger.info(`Login successful: ${user.email}`);

    // Publish login event
    await eventBus.publish('user.logged_in', {
      userId: user._id.toString(),
      email: user.email,
      timestamp: new Date(),
      ipAddress: req.ip
    });

    // Renvoyer la réponse
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
    });
  } catch (error) {
    logger.error("Error in login:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la connexion",
      error: error.message
    });
  }
};

/**
 * Get current user
 * GET /auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token manquant"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("-password -twoFactorSecret -twoFactorAuth.secret -twoFactorAuth.backupCodes");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error("Error in getMe:", error);
    res.status(401).json({
      success: false,
      message: "Token invalide"
    });
  }
};

/**
 * Refresh access token
 * POST /auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token manquant"
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.accountStatus.isActive) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur invalide"
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    logger.error("Error in refreshToken:", error);
    res.status(401).json({
      success: false,
      message: "Token invalide"
    });
  }
};

/**
 * Logout user
 * POST /auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (deviceId) {
      // Remove specific device
      await User.updateOne(
        { _id: userId },
        { $pull: { devices: { deviceId } } }
      );
    }

    // Publish logout event
    await eventBus.publish('user.logged_out', {
      userId,
      timestamp: new Date()
    });

    logger.info(`User logged out: ${userId}`);

    res.json({
      success: true,
      message: "Déconnexion réussie"
    });
  } catch (error) {
    logger.error("Error in logout:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la déconnexion"
    });
  }
};

/**
 * Change password
 * POST /auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Ancien et nouveau mot de passe requis"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect"
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    // Publish password changed event
    await eventBus.publish('user.password_changed', {
      userId: user._id.toString(),
      email: user.email,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Mot de passe modifié avec succès"
    });
  } catch (error) {
    logger.error("Error in changePassword:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du changement de mot de passe"
    });
  }
};
