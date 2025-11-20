const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { auth, optionalAuth, isHost } = require('../../middleware/auth');
const controller = require('./experienceController');

/**
 * @swagger
 * tags:
 *   name: Experiences
 *   description: Experience management endpoints
 */

/**
 * @swagger
 * /api/experiences:
 *   post:
 *     summary: Create new experience (host only)
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Experience'
 *     responses:
 *       201:
 *         description: Experience created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Host role required
 */
router.post(
  '/',
  auth,
  isHost,
  [
    body('title').trim().notEmpty().isLength({ max: 100 }),
    body('description').trim().notEmpty().isLength({ max: 2000 }),
    body('category').isIn([
      'food',
      'art',
      'nature',
      'sports',
      'wellness',
      'culture',
      'adventure',
      'entertainment',
      'workshop',
      'sightseeing',
    ]),
    body('location.city').trim().notEmpty(),
    body('location.country').trim().notEmpty(),
    body('duration').isInt({ min: 30, max: 1440 }),
    body('capacity.max').isInt({ min: 1 }),
    body('pricePerPerson').isFloat({ min: 0 }),
  ],
  controller.createExperience
);

/**
 * @swagger
 * /api/experiences:
 *   get:
 *     summary: Get all experiences with filters
 *     tags: [Experiences]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: activityLevel
 *         schema:
 *           type: string
 *           enum: [easy, moderate, challenging, extreme]
 *       - in: query
 *         name: isOnline
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of experiences
 */
router.get('/', optionalAuth, controller.getExperiences);

/**
 * @swagger
 * /api/experiences/{id}:
 *   get:
 *     summary: Get experience by ID
 *     tags: [Experiences]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experience details
 *       404:
 *         description: Experience not found
 */
router.get('/:id', optionalAuth, param('id').isMongoId(), controller.getExperienceById);

/**
 * @swagger
 * /api/experiences/{id}:
 *   put:
 *     summary: Update experience (host only)
 *     tags: [Experiences]
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
 *         description: Experience updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Experience not found
 */
router.put('/:id', auth, isHost, param('id').isMongoId(), controller.updateExperience);

/**
 * @swagger
 * /api/experiences/{id}:
 *   delete:
 *     summary: Delete experience (host only)
 *     tags: [Experiences]
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
 *         description: Experience deleted
 *       400:
 *         description: Cannot delete with active bookings
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Experience not found
 */
router.delete('/:id', auth, isHost, param('id').isMongoId(), controller.deleteExperience);

/**
 * @swagger
 * /api/experiences/host/my:
 *   get:
 *     summary: Get host's experiences
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of host's experiences
 */
router.get('/host/my', auth, isHost, controller.getHostExperiences);

/**
 * @swagger
 * /api/experiences/host/{hostId}:
 *   get:
 *     summary: Get experiences by host ID
 *     tags: [Experiences]
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of host's experiences
 */
router.get('/host/:hostId', controller.getHostExperiences);

module.exports = router;
