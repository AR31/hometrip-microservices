const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authMiddleware = require('../../middleware/auth');
const userController = require('./users.controller');

/**
 * Public Routes (Read-only without authentication)
 */

/**
 * GET /users/:id
 * Get user profile by ID (public profile)
 */
router.get('/:id', userController.getUserProfile);

/**
 * Protected Routes (Require authentication)
 */

/**
 * GET /users/me
 * Get current authenticated user profile
 */
router.get('/me', authMiddleware, userController.getCurrentUserProfile);

/**
 * PUT /users/:id
 * Update user profile
 * Body: { fullName, bio, phoneNumber, dateOfBirth, address }
 */
router.put(
  '/:id',
  authMiddleware,
  [
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('phoneNumber').optional().isMobilePhone(),
    body('dateOfBirth').optional().isISO8601(),
    body('address.city').optional().trim(),
    body('address.country').optional().trim()
  ],
  userController.updateUserProfile
);

/**
 * DELETE /users/:id
 * Delete user account
 */
router.delete('/:id', authMiddleware, userController.deleteUser);

/**
 * Favorites Routes
 */

/**
 * GET /users/:id/favorites
 * Get user's favorite listings
 */
router.get('/:id/favorites', authMiddleware, userController.getUserFavorites);

/**
 * POST /users/:id/favorites/:listingId
 * Add listing to favorites
 */
router.post(
  '/:id/favorites/:listingId',
  authMiddleware,
  [
    body('listingId').notEmpty().isMongoId()
  ],
  userController.addFavorite
);

/**
 * DELETE /users/:id/favorites/:listingId
 * Remove listing from favorites
 */
router.delete(
  '/:id/favorites/:listingId',
  authMiddleware,
  userController.removeFavorite
);

/**
 * Identity Verification Routes
 */

/**
 * POST /users/:id/verify-identity
 * Verify user identity
 * Body: { documentType, documentUrl, verificationMethod }
 */
router.post(
  '/:id/verify-identity',
  authMiddleware,
  [
    body('documentType').notEmpty().trim(),
    body('documentUrl').notEmpty().isURL(),
    body('verificationMethod').notEmpty().isIn(['identity', 'selfie', 'phone'])
  ],
  userController.verifyIdentity
);

/**
 * GET /users/:id/verification-status
 * Get user verification status
 */
router.get(
  '/:id/verification-status',
  authMiddleware,
  userController.getVerificationStatus
);

/**
 * Settings Routes
 */

/**
 * PUT /users/:id/settings
 * Update user settings and preferences
 * Body: { notifications: { email, push, sms, marketing }, preferences: { language, currency, theme } }
 */
router.put(
  '/:id/settings',
  authMiddleware,
  [
    body('notifications.email').optional().isBoolean(),
    body('notifications.push').optional().isBoolean(),
    body('notifications.sms').optional().isBoolean(),
    body('notifications.marketing').optional().isBoolean(),
    body('preferences.language').optional().trim().isLength({ min: 2, max: 5 }),
    body('preferences.currency').optional().trim().isLength({ min: 3, max: 3 }),
    body('preferences.theme').optional().isIn(['light', 'dark'])
  ],
  userController.updateUserSettings
);

/**
 * Device Management Routes
 */

/**
 * GET /users/:id/devices
 * Get user's registered devices
 */
router.get(
  '/:id/devices',
  authMiddleware,
  userController.getUserDevices
);

/**
 * POST /users/:id/devices
 * Register or update device information
 * Body: { deviceId, deviceName, deviceType, browser, os, ipAddress }
 */
router.post(
  '/:id/devices',
  authMiddleware,
  [
    body('deviceId').notEmpty().trim(),
    body('deviceName').optional().trim(),
    body('deviceType').optional().isIn(['mobile', 'tablet', 'desktop']),
    body('browser').optional().trim(),
    body('os').optional().trim(),
    body('ipAddress').optional().isIP()
  ],
  userController.addDevice
);

/**
 * DELETE /users/:id/devices/:deviceId
 * Remove a device
 */
router.delete(
  '/:id/devices/:deviceId',
  authMiddleware,
  userController.removeDevice
);

module.exports = router;
