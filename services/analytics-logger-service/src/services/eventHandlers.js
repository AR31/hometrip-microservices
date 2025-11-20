const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const moment = require('moment');
const mongoose = require('mongoose');

/**
 * Handle booking.created event
 */
exports.handleBookingCreated = async (data) => {
  try {
    const { bookingId, hostId, guestId, price, nights } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'bookings',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.totalBookings': 1,
            'metrics.bookedNights': nights || 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    logger.info(`Booking created: ${bookingId} by host ${hostId}`);
  } catch (error) {
    logger.error('Error handling booking.created event:', error);
  }
};

/**
 * Handle booking.confirmed event
 */
exports.handleBookingConfirmed = async (data) => {
  try {
    const { bookingId, hostId, guestId, price, nights } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'revenue',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.confirmedBookings': 1,
            'metrics.totalRevenue': price || 0
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    // Update admin analytics
    await Analytics.findOneAndUpdate(
      {
        type: 'admin_dashboard',
        yearMonthDay,
        period: 'daily'
      },
      {
        $inc: {
          'metrics.confirmedBookings': 1,
          'metrics.totalRevenue': price || 0,
          'metrics.totalBookings': 1
        },
        date: new Date(),
        $setOnInsert: { status: 'processed', source: 'event' }
      },
      { upsert: true, new: true }
    );

    logger.info(`Booking confirmed: ${bookingId}`);
  } catch (error) {
    logger.error('Error handling booking.confirmed event:', error);
  }
};

/**
 * Handle booking.cancelled event
 */
exports.handleBookingCancelled = async (data) => {
  try {
    const { bookingId, hostId, guestId, price, nights } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'bookings',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.cancelledBookings': 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    // Update admin analytics
    await Analytics.findOneAndUpdate(
      {
        type: 'admin_dashboard',
        yearMonthDay,
        period: 'daily'
      },
      {
        $inc: {
          'metrics.cancelledBookings': 1
        },
        date: new Date(),
        $setOnInsert: { status: 'processed', source: 'event' }
      },
      { upsert: true, new: true }
    );

    logger.info(`Booking cancelled: ${bookingId}`);
  } catch (error) {
    logger.error('Error handling booking.cancelled event:', error);
  }
};

/**
 * Handle payment.succeeded event
 */
exports.handlePaymentSucceeded = async (data) => {
  try {
    const { paymentId, hostId, amount, bookingId } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'revenue',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.totalRevenue': amount || 0,
            'metrics.completedBookings': 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    // Update admin analytics
    await Analytics.findOneAndUpdate(
      {
        type: 'admin_dashboard',
        yearMonthDay,
        period: 'daily'
      },
      {
        $inc: {
          'metrics.totalRevenue': amount || 0,
          'metrics.completedBookings': 1
        },
        date: new Date(),
        $setOnInsert: { status: 'processed', source: 'event' }
      },
      { upsert: true, new: true }
    );

    logger.info(`Payment succeeded: ${paymentId} for booking ${bookingId}`);
  } catch (error) {
    logger.error('Error handling payment.succeeded event:', error);
  }
};

/**
 * Handle listing.created event
 */
exports.handleListingCreated = async (data) => {
  try {
    const { listingId, hostId } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'host_dashboard',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.newListings': 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    // Update admin analytics
    await Analytics.findOneAndUpdate(
      {
        type: 'admin_dashboard',
        yearMonthDay,
        period: 'daily'
      },
      {
        $inc: {
          'metrics.newListings': 1
        },
        date: new Date(),
        $setOnInsert: { status: 'processed', source: 'event' }
      },
      { upsert: true, new: true }
    );

    logger.info(`Listing created: ${listingId} by host ${hostId}`);
  } catch (error) {
    logger.error('Error handling listing.created event:', error);
  }
};

/**
 * Handle user.created event
 */
exports.handleUserCreated = async (data) => {
  try {
    const { userId, role } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update admin analytics
    const update = {
      $inc: {
        'metrics.newUsers': 1
      },
      date: new Date(),
      $setOnInsert: { status: 'processed', source: 'event' }
    };

    if (role === 'host') {
      update.$inc['metrics.hostCount'] = 1;
    } else if (role === 'guest') {
      update.$inc['metrics.guestCount'] = 1;
    }

    await Analytics.findOneAndUpdate(
      {
        type: 'admin_dashboard',
        yearMonthDay,
        period: 'daily'
      },
      update,
      { upsert: true, new: true }
    );

    logger.info(`User created: ${userId} with role ${role}`);
  } catch (error) {
    logger.error('Error handling user.created event:', error);
  }
};

/**
 * Handle listing.viewed event
 */
exports.handleListingViewed = async (data) => {
  try {
    const { listingId, hostId, viewerId } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'host_dashboard',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.listingViews': 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    logger.info(`Listing viewed: ${listingId}`);
  } catch (error) {
    logger.error('Error handling listing.viewed event:', error);
  }
};

/**
 * Handle review.created event
 */
exports.handleReviewCreated = async (data) => {
  try {
    const { reviewId, hostId, rating, listingId } = data;

    const yearMonthDay = moment().format('YYYY-MM-DD');

    // Update host analytics
    if (hostId) {
      await Analytics.findOneAndUpdate(
        {
          type: 'host_dashboard',
          hostId: mongoose.Types.ObjectId(hostId),
          yearMonthDay,
          period: 'daily'
        },
        {
          $inc: {
            'metrics.newReviews': 1,
            'metrics.totalReviews': 1
          },
          date: new Date(),
          $setOnInsert: { status: 'processed', source: 'event' }
        },
        { upsert: true, new: true }
      );
    }

    logger.info(`Review created: ${reviewId} for host ${hostId}`);
  } catch (error) {
    logger.error('Error handling review.created event:', error);
  }
};
