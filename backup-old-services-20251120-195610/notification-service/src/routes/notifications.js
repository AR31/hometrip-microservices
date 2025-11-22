const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Récupérer toutes les notifications
 */
router.get('/', auth, notificationController.getNotifications);

/**
 * GET /api/notifications/unread-count
 * Obtenir le nombre de notifications non lues
 * IMPORTANT: Placer avant /:id
 */
router.get('/unread-count', auth, notificationController.getUnreadCount);

/**
 * GET /api/notifications/:id
 * Récupérer une notification spécifique
 */
router.get('/:id', auth, notificationController.getNotification);

/**
 * PUT /api/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put('/:id/read', auth, notificationController.markAsRead);

/**
 * PUT /api/notifications/:id/unread
 * Marquer une notification comme non lue
 */
router.put('/:id/unread', auth, notificationController.markAsUnread);

/**
 * PUT /api/notifications/mark-all-read
 * Marquer toutes les notifications comme lues
 */
router.put('/mark-all-read', auth, notificationController.markAllAsRead);

/**
 * PUT /api/notifications/:id/archive
 * Archiver une notification
 */
router.put('/:id/archive', auth, notificationController.archiveNotification);

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
router.delete('/:id', auth, notificationController.deleteNotification);

/**
 * DELETE /api/notifications/bulk-delete
 * Supprimer plusieurs notifications
 * IMPORTANT: Placer avant /:id
 */
router.delete('/bulk-delete', auth, notificationController.bulkDeleteNotifications);

module.exports = router;
