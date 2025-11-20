const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { auth, isHost } = require('../../middleware/auth');
const controller = require('./experienceController');

/**
 * @swagger
 * tags:
 *   name: Experience Bookings
 *   description: Experience booking management endpoints
 */

/**
 * @swagger
 * /api/experience-bookings:
 *   post:
 *     summary: Create experience booking
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - experienceId
 *               - date
 *               - startTime
 *               - numberOfParticipants
 *             properties:
 *               experienceId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               numberOfParticipants:
 *                 type: number
 *               participantDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *               specialRequests:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid request or not available
 *       404:
 *         description: Experience not found
 */
router.post(
  '/',
  auth,
  [
    body('experienceId').isMongoId(),
    body('date').isISO8601().toDate(),
    body('startTime').notEmpty(),
    body('numberOfParticipants').isInt({ min: 1 }),
    body('participantDetails').optional().isArray(),
    body('specialRequests').optional().isString().isLength({ max: 500 }),
  ],
  controller.createBooking
);

/**
 * @swagger
 * /api/experience-bookings/my:
 *   get:
 *     summary: Get user's experience bookings
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled, declined]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user's bookings
 */
router.get('/my', auth, controller.getUserBookings);

/**
 * @swagger
 * /api/experience-bookings/host/all:
 *   get:
 *     summary: Get host's experience bookings
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: experienceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of host's bookings
 */
router.get('/host/all', auth, isHost, controller.getHostBookings);

/**
 * @swagger
 * /api/experience-bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get('/:id', auth, param('id').isMongoId(), controller.getBookingById);

/**
 * @swagger
 * /api/experience-bookings/{id}/cancel:
 *   put:
 *     summary: Cancel booking
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put(
  '/:id/cancel',
  auth,
  param('id').isMongoId(),
  body('reason').optional().isString(),
  controller.cancelBooking
);

/**
 * @swagger
 * /api/experience-bookings/{id}/confirm:
 *   put:
 *     summary: Confirm booking (host only)
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put('/:id/confirm', auth, isHost, param('id').isMongoId(), controller.confirmBooking);

/**
 * @swagger
 * /api/experience-bookings/{id}/complete:
 *   put:
 *     summary: Complete booking (host only, after experience date)
 *     tags: [Experience Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking completed
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.put('/:id/complete', auth, isHost, param('id').isMongoId(), controller.completeBooking);

module.exports = router;
