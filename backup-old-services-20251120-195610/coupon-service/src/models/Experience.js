const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Experience:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - host
 *         - location
 *         - duration
 *         - capacity
 *         - pricePerPerson
 *       properties:
 *         title:
 *           type: string
 *           description: Experience title
 *         description:
 *           type: string
 *           description: Detailed description
 *         category:
 *           type: string
 *           enum: [food, art, nature, sports, wellness, culture, adventure, entertainment, workshop, sightseeing]
 *           description: Experience category
 *         host:
 *           type: string
 *           description: Host user ID
 *         location:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             country:
 *               type: string
 *             address:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 lat:
 *                   type: number
 *                 lng:
 *                   type: number
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         capacity:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *         pricePerPerson:
 *           type: number
 *           description: Price per participant
 *         languages:
 *           type: array
 *           items:
 *             type: string
 *         activityLevel:
 *           type: string
 *           enum: [easy, moderate, challenging, extreme]
 *         ageRestriction:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *         included:
 *           type: array
 *           items:
 *             type: string
 *           description: What's included
 *         toBring:
 *           type: array
 *           items:
 *             type: string
 *           description: What to bring
 *         cancellationPolicy:
 *           type: string
 *           enum: [flexible, moderate, strict]
 *         availability:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               availableSpots:
 *                 type: number
 *         isActive:
 *           type: boolean
 *         isOnline:
 *           type: boolean
 *         averageRating:
 *           type: number
 *         totalReviews:
 *           type: number
 */

const experienceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    host: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      city: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v && v.length <= 10;
        },
        message: 'Maximum 10 images allowed',
      },
      default: [],
    },
    duration: {
      type: Number,
      required: true,
      min: 30,
      max: 1440, // 24 hours in minutes
    },
    capacity: {
      min: {
        type: Number,
        default: 1,
      },
      max: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    pricePerPerson: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CHF'],
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    activityLevel: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'extreme'],
      default: 'moderate',
    },
    ageRestriction: {
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 120,
      },
    },
    included: {
      type: [String],
      default: [],
    },
    toBring: {
      type: [String],
      default: [],
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate',
    },
    availability: [
      {
        date: {
          type: Date,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        availableSpots: {
          type: Number,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
experienceSchema.index({ host: 1, createdAt: -1 });
experienceSchema.index({ category: 1, isActive: 1 });
experienceSchema.index({ 'location.city': 1, 'location.country': 1 });
experienceSchema.index({ averageRating: -1 });
experienceSchema.index({ pricePerPerson: 1 });

module.exports = mongoose.model('Experience', experienceSchema);
