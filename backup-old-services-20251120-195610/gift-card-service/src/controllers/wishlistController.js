const Wishlist = require('../models/Wishlist');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

// Create gift-card
exports.createWishlist = async (req, res) => {
  try {
    const { name, description, isPrivate, coverImage } = req.body;

    const gift-card = new Wishlist({
      user: req.user.id,
      name,
      description,
      isPrivate,
      coverImage,
      listings: [],
    });

    await gift-card.save();

    await eventBus.publish('gift-card.created', {
      gift-cardId: gift-card._id,
      userId: req.user.id,
      name: gift-card.name,
    });

    logger.info(`Wishlist created: ${gift-card._id}`);

    res.status(201).json({
      success: true,
      data: gift-card,
    });
  } catch (error) {
    logger.error('Error creating gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's gift-cards
exports.getUserWishlists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [gift-cards, total] = await Promise.all([
      Wishlist.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Wishlist.countDocuments({ user: req.user.id }),
    ]);

    res.json({
      success: true,
      data: gift-cards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching gift-cards:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get gift-card by ID
exports.getWishlistById = async (req, res) => {
  try {
    const { id } = req.params;

    const gift-card = await Wishlist.findById(id).lean();

    if (!gift-card) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check authorization (owner or public gift-card)
    if (gift-card.isPrivate && gift-card.user !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This gift-card is private.',
      });
    }

    res.json({
      success: true,
      data: gift-card,
    });
  } catch (error) {
    logger.error('Error fetching gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update gift-card
exports.updateWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPrivate, coverImage } = req.body;

    const gift-card = await Wishlist.findById(id);

    if (!gift-card) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (gift-card.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this gift-card',
      });
    }

    if (name) gift-card.name = name;
    if (description !== undefined) gift-card.description = description;
    if (isPrivate !== undefined) gift-card.isPrivate = isPrivate;
    if (coverImage !== undefined) gift-card.coverImage = coverImage;

    await gift-card.save();

    await eventBus.publish('gift-card.updated', {
      gift-cardId: gift-card._id,
      userId: req.user.id,
    });

    logger.info(`Wishlist updated: ${gift-card._id}`);

    res.json({
      success: true,
      data: gift-card,
    });
  } catch (error) {
    logger.error('Error updating gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete gift-card
exports.deleteWishlist = async (req, res) => {
  try {
    const { id } = req.params;

    const gift-card = await Wishlist.findById(id);

    if (!gift-card) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (gift-card.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this gift-card',
      });
    }

    await Wishlist.findByIdAndDelete(id);

    await eventBus.publish('gift-card.deleted', {
      gift-cardId: id,
      userId: req.user.id,
    });

    logger.info(`Wishlist deleted: ${id}`);

    res.json({
      success: true,
      message: 'Wishlist deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add listing to gift-card
exports.addListingToWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { listingId, notes } = req.body;

    const gift-card = await Wishlist.findById(id);

    if (!gift-card) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (gift-card.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this gift-card',
      });
    }

    // Check if listing already exists
    const existingListing = gift-card.listings.find(
      (item) => item.listingId === listingId
    );

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: 'Listing already in gift-card',
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

    gift-card.listings.push({
      listingId,
      notes,
      addedAt: new Date(),
    });

    await gift-card.save();

    await eventBus.publish('gift-card.listing.added', {
      gift-cardId: gift-card._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing added to gift-card: ${listingId} -> ${gift-card._id}`);

    res.json({
      success: true,
      data: gift-card,
    });
  } catch (error) {
    logger.error('Error adding listing to gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Remove listing from gift-card
exports.removeListingFromWishlist = async (req, res) => {
  try {
    const { id, listingId } = req.params;

    const gift-card = await Wishlist.findById(id);

    if (!gift-card) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (gift-card.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this gift-card',
      });
    }

    // Remove listing
    gift-card.listings = gift-card.listings.filter(
      (item) => item.listingId !== listingId
    );

    await gift-card.save();

    await eventBus.publish('gift-card.listing.removed', {
      gift-cardId: gift-card._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing removed from gift-card: ${listingId} <- ${gift-card._id}`);

    res.json({
      success: true,
      data: gift-card,
    });
  } catch (error) {
    logger.error('Error removing listing from gift-card:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Check if listing is in any gift-card
exports.checkListingInWishlists = async (req, res) => {
  try {
    const { listingId } = req.params;

    const gift-cards = await Wishlist.find({
      user: req.user.id,
      'listings.listingId': listingId,
    }).select('_id name').lean();

    res.json({
      success: true,
      inWishlists: gift-cards.length > 0,
      gift-cards,
    });
  } catch (error) {
    logger.error('Error checking listing in gift-cards:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
