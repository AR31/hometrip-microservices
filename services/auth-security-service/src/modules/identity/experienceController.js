const Experience = require('../../models/Experience');
const ExperienceBooking = require('../../models/ExperienceBooking');
const eventBus = require('../../utils/eventBus');
const logger = require('../../utils/logger');
const moment = require('moment');

// Create new experience (host only)
exports.createExperience = async (req, res) => {
  try {
    const experienceData = {
      ...req.body,
      host: req.user.id,
    };

    const experience = new Experience(experienceData);
    await experience.save();

    // Publish event
    await eventBus.publish('experience.created', {
      experienceId: experience._id,
      hostId: req.user.id,
      category: experience.category,
      city: experience.location.city,
    });

    logger.info(`Experience created: ${experience._id}`);

    res.status(201).json({
      success: true,
      data: experience,
    });
  } catch (error) {
    logger.error('Error creating experience:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all experiences with filters
exports.getExperiences = async (req, res) => {
  try {
    const {
      category,
      city,
      country,
      minPrice,
      maxPrice,
      activityLevel,
      isOnline,
      minRating,
      language,
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (country) filter['location.country'] = new RegExp(country, 'i');
    if (activityLevel) filter.activityLevel = activityLevel;
    if (isOnline !== undefined) filter.isOnline = isOnline === 'true';
    if (language) filter.languages = language;

    if (minPrice || maxPrice) {
      filter.pricePerPerson = {};
      if (minPrice) filter.pricePerPerson.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerPerson.$lte = Number(maxPrice);
    }

    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    // Filter by availability date
    if (date) {
      const targetDate = moment(date).toDate();
      filter['availability.date'] = {
        $gte: targetDate,
        $lt: moment(targetDate).add(1, 'day').toDate(),
      };
      filter['availability.availableSpots'] = { $gt: 0 };
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const [experiences, total] = await Promise.all([
      Experience.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Experience.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: experiences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching experiences:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single experience by ID
exports.getExperienceById = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    // Publish view event
    await eventBus.publish('experience.viewed', {
      experienceId: experience._id,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: experience,
    });
  } catch (error) {
    logger.error('Error fetching experience:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update experience (host only)
exports.updateExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    // Check ownership
    if (experience.host !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this experience',
      });
    }

    // Update fields
    Object.assign(experience, req.body);
    await experience.save();

    // Publish event
    await eventBus.publish('experience.updated', {
      experienceId: experience._id,
      hostId: experience.host,
    });

    logger.info(`Experience updated: ${experience._id}`);

    res.json({
      success: true,
      data: experience,
    });
  } catch (error) {
    logger.error('Error updating experience:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete experience (host only)
exports.deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    // Check ownership
    if (experience.host !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this experience',
      });
    }

    // Check for active bookings
    const activeBookings = await ExperienceBooking.countDocuments({
      experience: id,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete experience with active bookings',
      });
    }

    await Experience.findByIdAndDelete(id);

    // Publish event
    await eventBus.publish('experience.deleted', {
      experienceId: id,
      hostId: experience.host,
    });

    logger.info(`Experience deleted: ${id}`);

    res.json({
      success: true,
      message: 'Experience deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting experience:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get host's experiences
exports.getHostExperiences = async (req, res) => {
  try {
    const hostId = req.params.hostId || req.user.id;

    const {
      isActive,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { host: hostId };

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (category) filter.category = category;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [experiences, total] = await Promise.all([
      Experience.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Experience.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: experiences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching host experiences:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Create experience booking
exports.createBooking = async (req, res) => {
  try {
    const {
      experienceId,
      date,
      startTime,
      numberOfParticipants,
      participantDetails,
      specialRequests,
    } = req.body;

    const experience = await Experience.findById(experienceId);

    if (!experience || !experience.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found or inactive',
      });
    }

    // Check capacity
    if (numberOfParticipants < experience.capacity.min ||
        numberOfParticipants > experience.capacity.max) {
      return res.status(400).json({
        success: false,
        error: `Participants must be between ${experience.capacity.min} and ${experience.capacity.max}`,
      });
    }

    // Check availability
    const targetDate = moment(date).toDate();
    const availability = experience.availability.find(
      (slot) =>
        moment(slot.date).isSame(targetDate, 'day') &&
        slot.startTime === startTime &&
        slot.availableSpots >= numberOfParticipants
    );

    if (!availability) {
      return res.status(400).json({
        success: false,
        error: 'Not available at selected date/time or insufficient spots',
      });
    }

    // Calculate price
    const totalPrice = experience.pricePerPerson * numberOfParticipants;

    // Create booking
    const booking = new ExperienceBooking({
      experience: experienceId,
      user: req.user.id,
      host: experience.host,
      date: targetDate,
      startTime,
      endTime: availability.endTime,
      numberOfParticipants,
      participantDetails,
      totalPrice,
      currency: experience.currency,
      specialRequests,
      status: 'pending',
    });

    await booking.save();

    // Update availability
    availability.availableSpots -= numberOfParticipants;
    await experience.save();

    // Publish event
    await eventBus.publish('experience.booking.created', {
      bookingId: booking._id,
      experienceId,
      userId: req.user.id,
      hostId: experience.host,
      totalPrice,
    });

    logger.info(`Experience booking created: ${booking._id}`);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
  try {
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { user: req.user.id };

    if (status) filter.status = status;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      ExperienceBooking.find(filter)
        .populate('experience')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ExperienceBooking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get host's bookings
exports.getHostBookings = async (req, res) => {
  try {
    const {
      status,
      experienceId,
      sortBy = 'date',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { host: req.user.id };

    if (status) filter.status = status;
    if (experienceId) filter.experience = experienceId;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      ExperienceBooking.find(filter)
        .populate('experience')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ExperienceBooking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching host bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await ExperienceBooking.findById(id).populate('experience');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check ownership or admin
    if (booking.user !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this booking',
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel ${booking.status} booking`,
      });
    }

    // Calculate refund based on cancellation policy
    let refundAmount = 0;
    const hoursUntilExperience = moment(booking.date).diff(moment(), 'hours');

    switch (booking.experience.cancellationPolicy) {
      case 'flexible':
        refundAmount = booking.totalPrice;
        break;
      case 'moderate':
        if (hoursUntilExperience >= 24) {
          refundAmount = booking.totalPrice;
        } else if (hoursUntilExperience >= 12) {
          refundAmount = booking.totalPrice * 0.5;
        }
        break;
      case 'strict':
        if (hoursUntilExperience >= 168) { // 7 days
          refundAmount = booking.totalPrice;
        }
        break;
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.refundAmount = refundAmount;
    booking.cancelledAt = new Date();
    await booking.save();

    // Restore availability
    const experience = await Experience.findById(booking.experience._id);
    const availability = experience.availability.find(
      (slot) =>
        moment(slot.date).isSame(booking.date, 'day') &&
        slot.startTime === booking.startTime
    );

    if (availability) {
      availability.availableSpots += booking.numberOfParticipants;
      await experience.save();
    }

    // Publish event
    await eventBus.publish('experience.booking.cancelled', {
      bookingId: booking._id,
      userId: booking.user,
      hostId: booking.host,
      refundAmount,
    });

    logger.info(`Experience booking cancelled: ${booking._id}`);

    res.json({
      success: true,
      data: booking,
      message: `Booking cancelled. Refund: ${refundAmount} ${booking.currency}`,
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await ExperienceBooking.findById(id).populate('experience');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check authorization
    if (
      booking.user !== req.user.id &&
      booking.host !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Confirm booking (host only)
exports.confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await ExperienceBooking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check host authorization
    if (booking.host !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending bookings can be confirmed',
      });
    }

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    // Publish event
    await eventBus.publish('experience.booking.confirmed', {
      bookingId: booking._id,
      userId: booking.user,
      hostId: booking.host,
    });

    logger.info(`Experience booking confirmed: ${booking._id}`);

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error confirming booking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Complete booking (after experience date)
exports.completeBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await ExperienceBooking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check host authorization
    if (booking.host !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Only confirmed bookings can be completed',
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Publish event
    await eventBus.publish('experience.booking.completed', {
      bookingId: booking._id,
      experienceId: booking.experience,
      userId: booking.user,
      hostId: booking.host,
    });

    logger.info(`Experience booking completed: ${booking._id}`);

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('Error completing booking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
