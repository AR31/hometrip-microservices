const Dispute = require('../models/Dispute');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

// Create dispute
exports.createDispute = async (req, res) => {
  try {
    const { name, description, isPrivate, coverImage } = req.body;

    const dispute = new Dispute({
      user: req.user.id,
      name,
      description,
      isPrivate,
      coverImage,
      listings: [],
    });

    await dispute.save();

    await eventBus.publish('dispute.created', {
      disputeId: dispute._id,
      userId: req.user.id,
      name: dispute.name,
    });

    logger.info(`Dispute created: ${dispute._id}`);

    res.status(201).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's disputes
exports.getUserDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      Dispute.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments({ user: req.user.id }),
    ]);

    res.json({
      success: true,
      data: disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get dispute by ID
exports.getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findById(id).lean();

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check authorization (owner or public dispute)
    if (dispute.isPrivate && dispute.user !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This dispute is private.',
      });
    }

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update dispute
exports.updateDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPrivate, coverImage } = req.body;

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check ownership
    if (dispute.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this dispute',
      });
    }

    if (name) dispute.name = name;
    if (description !== undefined) dispute.description = description;
    if (isPrivate !== undefined) dispute.isPrivate = isPrivate;
    if (coverImage !== undefined) dispute.coverImage = coverImage;

    await dispute.save();

    await eventBus.publish('dispute.updated', {
      disputeId: dispute._id,
      userId: req.user.id,
    });

    logger.info(`Dispute updated: ${dispute._id}`);

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error updating dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete dispute
exports.deleteDispute = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check ownership
    if (dispute.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this dispute',
      });
    }

    await Dispute.findByIdAndDelete(id);

    await eventBus.publish('dispute.deleted', {
      disputeId: id,
      userId: req.user.id,
    });

    logger.info(`Dispute deleted: ${id}`);

    res.json({
      success: true,
      message: 'Dispute deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add listing to dispute
exports.addListingToDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { listingId, notes } = req.body;

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check ownership
    if (dispute.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this dispute',
      });
    }

    // Check if listing already exists
    const existingListing = dispute.listings.find(
      (item) => item.listingId === listingId
    );

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: 'Listing already in dispute',
      });
    }

    // Verify listing exists (call listing service)
    try {
      await axios.get(`${config.services.listingService}/api/listings/${listingId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    dispute.listings.push({
      listingId,
      notes,
      addedAt: new Date(),
    });

    await dispute.save();

    await eventBus.publish('dispute.listing.added', {
      disputeId: dispute._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing added to dispute: ${listingId} -> ${dispute._id}`);

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error adding listing to dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Remove listing from dispute
exports.removeListingFromDispute = async (req, res) => {
  try {
    const { id, listingId } = req.params;

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check ownership
    if (dispute.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this dispute',
      });
    }

    // Remove listing
    dispute.listings = dispute.listings.filter(
      (item) => item.listingId !== listingId
    );

    await dispute.save();

    await eventBus.publish('dispute.listing.removed', {
      disputeId: dispute._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing removed from dispute: ${listingId} <- ${dispute._id}`);

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error removing listing from dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Check if listing is in any dispute
exports.checkListingInDisputes = async (req, res) => {
  try {
    const { listingId } = req.params;

    const disputes = await Dispute.find({
      user: req.user.id,
      'listings.listingId': listingId,
    }).select('_id name').lean();

    res.json({
      success: true,
      inDisputes: disputes.length > 0,
      disputes,
    });
  } catch (error) {
    logger.error('Error checking listing in disputes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
