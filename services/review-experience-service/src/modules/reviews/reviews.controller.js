const Review = require('../models/Review');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');
const mongoose = require('mongoose');

/**
 * Create a new review
 */
const createReview = async (req, res) => {
  try {
    const { listingId, reservationId, revieweeId, reviewType, rating, comment, ratings: detailedRatings, photos } = req.body;

    // Validate required fields
    if (!listingId || !reservationId || !revieweeId || !reviewType || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      reservation: reservationId,
      reviewer: req.user.id,
      reviewType
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already left a review for this reservation'
      });
    }

    // Create review
    const review = new Review({
      listing: listingId,
      reservation: reservationId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      reviewType,
      rating,
      comment,
      ratings: detailedRatings || {},
      photos: photos || [],
      isPublic: true
    });

    await review.save();

    // Populate references
    await review.populate('reviewer', 'fullName avatar');
    await review.populate('reviewee', 'fullName avatar');

    // Publish event
    await eventBus.publish('review.created', {
      reviewId: review._id,
      listing: listingId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating,
      reviewType,
      timestamp: new Date()
    });

    logger.info(`Review created: ${review._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review'
    });
  }
};

/**
 * Get reviews for a listing with pagination and statistics
 */
const getListingReviews = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get reviews
    const reviews = await Review.find({
      listing: listingId,
      isPublic: true,
      isFlagged: false
    })
      .populate('reviewer', 'fullName avatar createdAt')
      .sort(sort)
      .limit(limitNum)
      .skip(skip)
      .exec();

    // Get total count
    const total = await Review.countDocuments({
      listing: listingId,
      isPublic: true,
      isFlagged: false
    });

    // Calculate statistics
    const stats = await Review.aggregate([
      {
        $match: {
          listing: mongoose.Types.ObjectId(listingId),
          isPublic: true,
          isFlagged: false
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          averageCleanliness: { $avg: '$ratings.cleanliness' },
          averageCommunication: { $avg: '$ratings.communication' },
          averageCheckIn: { $avg: '$ratings.checkIn' },
          averageAccuracy: { $avg: '$ratings.accuracy' },
          averageLocation: { $avg: '$ratings.location' },
          averageValue: { $avg: '$ratings.value' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          listing: mongoose.Types.ObjectId(listingId),
          isPublic: true,
          isFlagged: false
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        stats: stats[0] || {
          averageRating: 0,
          totalReviews: 0
        },
        ratingDistribution: ratingDistribution
      }
    });
  } catch (error) {
    logger.error('Error fetching listing reviews:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews'
    });
  }
};

/**
 * Get reviews received by a user
 */
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, reviewType } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      reviewee: userId,
      isPublic: true,
      isFlagged: false
    };

    if (reviewType) {
      query.reviewType = reviewType;
    }

    const reviews = await Review.find(query)
      .populate('reviewer', 'fullName avatar')
      .populate('listing', 'title images')
      .sort('-createdAt')
      .limit(limitNum)
      .skip(skip)
      .exec();

    const total = await Review.countDocuments(query);

    // Calculate user rating
    const stats = await Review.aggregate([
      {
        $match: {
          reviewee: mongoose.Types.ObjectId(userId),
          isPublic: true,
          isFlagged: false
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        userStats: stats[0] || {
          averageRating: 0,
          totalReviews: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user reviews'
    });
  }
};

/**
 * Respond to a review (host only)
 */
const respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response comment is required'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify that the current user is the reviewee (host)
    if (review.reviewee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can respond to this review'
      });
    }

    // Check if already responded
    if (review.hostResponse) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this review'
      });
    }

    // Add response
    review.hostResponse = {
      comment,
      respondedAt: new Date()
    };

    await review.save();

    // Populate for response
    await review.populate('reviewer', 'fullName avatar');
    await review.populate('reviewee', 'fullName avatar');

    // Publish event
    await eventBus.publish('review.responded', {
      reviewId: review._id,
      listing: review.listing,
      reviewer: review.reviewer,
      reviewee: review.reviewee,
      timestamp: new Date()
    });

    logger.info(`Review ${reviewId} responded by user ${req.user.id}`);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error responding to review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to respond to review'
    });
  }
};

/**
 * Flag a review for moderation
 */
const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Flag reason is required'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isFlagged = true;
    review.flagReason = reason;
    review.flaggedBy = req.user.id;
    review.flaggedAt = new Date();

    await review.save();

    logger.info(`Review ${reviewId} flagged by user ${req.user.id}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Review flagged for moderation',
      data: review
    });
  } catch (error) {
    logger.error('Error flagging review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to flag review'
    });
  }
};

/**
 * Moderate a review (approve or reject) - Admin only
 */
const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (action === 'approve') {
      review.isFlagged = false;
      review.flagReason = null;
      review.flaggedBy = null;
      review.flaggedAt = null;
      review.isPublic = true;
    } else if (action === 'reject') {
      review.isPublic = false;
      review.isFlagged = true;
      review.flagReason = reason || 'Rejected by moderator';
    }

    await review.save();

    // Publish moderation event
    await eventBus.publish('review.moderated', {
      reviewId: review._id,
      action,
      timestamp: new Date()
    });

    logger.info(`Review ${reviewId} moderated with action: ${action}`);

    res.json({
      success: true,
      message: `Review ${action}d successfully`,
      data: review
    });
  } catch (error) {
    logger.error('Error moderating review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to moderate review'
    });
  }
};

/**
 * Get moderation queue (flagged reviews)
 */
const getModerationQueue = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const reviews = await Review.find({ isFlagged: true })
      .populate('reviewer', 'fullName email')
      .populate('reviewee', 'fullName email')
      .populate('flaggedBy', 'fullName email')
      .sort('-flaggedAt')
      .limit(limitNum)
      .skip(skip)
      .exec();

    const total = await Review.countDocuments({ isFlagged: true });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching moderation queue:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch moderation queue'
    });
  }
};

/**
 * Get review statistics for a listing
 */
const getReviewStats = async (req, res) => {
  try {
    const { listingId } = req.params;

    const stats = await Review.aggregate([
      {
        $match: {
          listing: mongoose.Types.ObjectId(listingId),
          isPublic: true,
          isFlagged: false
        }
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                averageCleanliness: { $avg: '$ratings.cleanliness' },
                averageCommunication: { $avg: '$ratings.communication' },
                averageCheckIn: { $avg: '$ratings.checkIn' },
                averageAccuracy: { $avg: '$ratings.accuracy' },
                averageLocation: { $avg: '$ratings.location' },
                averageValue: { $avg: '$ratings.value' },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          ratingDistribution: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ],
          reviewTypeBreakdown: [
            {
              $group: {
                _id: '$reviewType',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        listing: listingId,
        stats: stats[0]
      }
    });
  } catch (error) {
    logger.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review statistics'
    });
  }
};

/**
 * Delete a review
 */
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Only allow deletion by reviewer or admin
    if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    logger.info(`Review ${reviewId} deleted by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete review'
    });
  }
};

module.exports = {
  createReview,
  getListingReviews,
  getUserReviews,
  respondToReview,
  flagReview,
  moderateReview,
  getModerationQueue,
  getReviewStats,
  deleteReview
};
