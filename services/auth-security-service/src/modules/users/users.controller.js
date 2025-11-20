const User = require('../../models/User');
const logger = require('../../utils/logger');
const eventBus = require('../../utils/eventBus');

/**
 * Get user profile by ID
 * GET /users/:id
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password')
      .populate('favorites', 'title images price location averageRating');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * Get current user profile (authenticated)
 * GET /users/me
 */
const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('favorites', 'title images price location averageRating');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching current user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * Update user profile
 * PUT /users/:id
 */
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, bio, phoneNumber, dateOfBirth, address } = req.body;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (address !== undefined) updates.address = address;

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Publish event
    await eventBus.publish('user.updated', {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: user
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

/**
 * Get user favorites
 * GET /users/:id/favorites
 */
const getUserFavorites = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('favorites')
      .populate('favorites', 'title images price location averageRating reviews');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    logger.error('Error fetching user favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des favoris'
    });
  }
};

/**
 * Add listing to favorites
 * POST /users/:id/favorites/:listingId
 */
const addFavorite = async (req, res) => {
  try {
    const { id, listingId } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Check if already in favorites
    if (user.favorites.includes(listingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ce logement est déjà dans vos favoris'
      });
    }

    // Add to favorites
    user.favorites.push(listingId);
    await user.save();

    // Publish event
    await eventBus.publish('favorite.added', {
      userId: user._id.toString(),
      listingId: listingId,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Logement ajouté aux favoris',
      data: {
        userId: user._id,
        listingId: listingId,
        totalFavorites: user.favorites.length
      }
    });
  } catch (error) {
    logger.error('Error adding favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout aux favoris'
    });
  }
};

/**
 * Remove listing from favorites
 * DELETE /users/:id/favorites/:listingId
 */
const removeFavorite = async (req, res) => {
  try {
    const { id, listingId } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Check if in favorites
    if (!user.favorites.includes(listingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ce logement ne figure pas dans vos favoris'
      });
    }

    // Remove from favorites
    user.favorites = user.favorites.filter(fav => fav.toString() !== listingId);
    await user.save();

    // Publish event
    await eventBus.publish('favorite.removed', {
      userId: user._id.toString(),
      listingId: listingId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Logement retiré des favoris',
      data: {
        userId: user._id,
        totalFavorites: user.favorites.length
      }
    });
  } catch (error) {
    logger.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des favoris'
    });
  }
};

/**
 * Verify user identity
 * POST /users/:id/verify-identity
 */
const verifyIdentity = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, documentUrl, verificationMethod } = req.body;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (!documentType || !documentUrl) {
      return res.status(400).json({
        success: false,
        message: 'documentType et documentUrl sont requis'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Update verification status
    if (verificationMethod === 'identity') {
      user.verificationStatus.identity = true;
    } else if (verificationMethod === 'selfie') {
      user.verificationStatus.selfie = true;
    } else if (verificationMethod === 'phone') {
      user.verificationStatus.phone = true;
    }

    // Mark as verified if all required verifications are complete
    if (
      user.verificationStatus.email &&
      user.verificationStatus.identity &&
      user.verificationStatus.phone
    ) {
      user.isVerified = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Identité vérifiée avec succès',
      data: {
        userId: user._id,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    logger.error('Error verifying identity:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'identité'
    });
  }
};

/**
 * Get verification status
 * GET /users/:id/verification-status
 */
const getVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id).select('verificationStatus isVerified');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    logger.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut de vérification'
    });
  }
};

/**
 * Update user settings and preferences
 * PUT /users/:id/settings
 */
const updateUserSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { notifications, preferences } = req.body;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const updates = {};
    if (notifications !== undefined) {
      updates.notifications = {
        ...notifications
      };
    }
    if (preferences !== undefined) {
      updates.preferences = {
        ...preferences
      };
    }

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Paramètres mis à jour avec succès',
      data: {
        notifications: user.notifications,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des paramètres'
    });
  }
};

/**
 * Add or update device information
 * POST /users/:id/devices
 */
const addDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, deviceName, deviceType, browser, os, ipAddress } = req.body;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId est requis'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Check if device already exists
    const existingDevice = user.devices.find(d => d.deviceId === deviceId);

    if (existingDevice) {
      // Update existing device
      existingDevice.lastActive = new Date();
      existingDevice.deviceName = deviceName || existingDevice.deviceName;
      existingDevice.browser = browser || existingDevice.browser;
      existingDevice.os = os || existingDevice.os;
      existingDevice.ipAddress = ipAddress || existingDevice.ipAddress;
    } else {
      // Add new device
      user.devices.push({
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        deviceType: deviceType || 'unknown',
        browser,
        os,
        ipAddress,
        lastActive: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Appareil enregistré avec succès',
      data: {
        devices: user.devices
      }
    });
  } catch (error) {
    logger.error('Error adding device:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'appareil'
    });
  }
};

/**
 * Get user devices
 * GET /users/:id/devices
 */
const getUserDevices = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id).select('devices');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.devices
    });
  } catch (error) {
    logger.error('Error fetching user devices:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des appareils'
    });
  }
};

/**
 * Remove device
 * DELETE /users/:id/devices/:deviceId
 */
const removeDevice = async (req, res) => {
  try {
    const { id, deviceId } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);

    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    user.devices.splice(deviceIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Appareil supprimé avec succès',
      data: {
        devices: user.devices
      }
    });
  } catch (error) {
    logger.error('Error removing device:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'appareil'
    });
  }
};

/**
 * Delete user account
 * DELETE /users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Publish event
    await eventBus.publish('user.deleted', {
      userId: user._id.toString(),
      email: user.email,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Compte utilisateur supprimé avec succès'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte'
    });
  }
};

/**
 * Sync user data from auth-service
 * Used internally for event subscription
 */
const syncUserFromAuth = async (userData) => {
  try {
    const { userId, email, fullName, role } = userData;

    const user = await User.findById(userId);

    if (user) {
      // Update existing user
      user.email = email;
      user.fullName = fullName;
      user.role = role;
      await user.save();
      logger.info(`User synced: ${userId}`);
    } else {
      // Create new user
      const newUser = new User({
        _id: userId,
        email,
        fullName,
        role,
        password: '' // Will be managed by auth-service
      });
      await newUser.save();
      logger.info(`New user created from auth-service: ${userId}`);
    }
  } catch (error) {
    logger.error('Error syncing user from auth-service:', error);
  }
};

module.exports = {
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  getUserFavorites,
  addFavorite,
  removeFavorite,
  verifyIdentity,
  getVerificationStatus,
  updateUserSettings,
  addDevice,
  getUserDevices,
  removeDevice,
  deleteUser,
  syncUserFromAuth
};
