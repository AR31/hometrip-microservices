const Wishlist = require('../models/Wishlist');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config');

// Create wishlist
exports.createWishlist = async (req, res) => {
  try {
    const { name, description, isPrivate, coverImage } = req.body;

    const wishlist = new Wishlist({
      user: req.user.id,
      name,
      description,
      isPrivate,
      coverImage,
      listings: [],
    });

    await wishlist.save();

    await eventBus.publish('wishlist.created', {
      wishlistId: wishlist._id,
      userId: req.user.id,
      name: wishlist.name,
    });

    logger.info(`Wishlist created: ${wishlist._id}`);

    res.status(201).json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    logger.error('Error creating wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's wishlists
exports.getUserWishlists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [wishlists, total] = await Promise.all([
      Wishlist.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Wishlist.countDocuments({ user: req.user.id }),
    ]);

    res.json({
      success: true,
      data: wishlists,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching wishlists:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get wishlist by ID
exports.getWishlistById = async (req, res) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findById(id).lean();

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check authorization (owner or public wishlist)
    if (wishlist.isPrivate && wishlist.user !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This wishlist is private.',
      });
    }

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    logger.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update wishlist
exports.updateWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPrivate, coverImage } = req.body;

    const wishlist = await Wishlist.findById(id);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (wishlist.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this wishlist',
      });
    }

    if (name) wishlist.name = name;
    if (description !== undefined) wishlist.description = description;
    if (isPrivate !== undefined) wishlist.isPrivate = isPrivate;
    if (coverImage !== undefined) wishlist.coverImage = coverImage;

    await wishlist.save();

    await eventBus.publish('wishlist.updated', {
      wishlistId: wishlist._id,
      userId: req.user.id,
    });

    logger.info(`Wishlist updated: ${wishlist._id}`);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    logger.error('Error updating wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete wishlist
exports.deleteWishlist = async (req, res) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findById(id);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (wishlist.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this wishlist',
      });
    }

    await Wishlist.findByIdAndDelete(id);

    await eventBus.publish('wishlist.deleted', {
      wishlistId: id,
      userId: req.user.id,
    });

    logger.info(`Wishlist deleted: ${id}`);

    res.json({
      success: true,
      message: 'Wishlist deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Add listing to wishlist
exports.addListingToWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { listingId, notes } = req.body;

    const wishlist = await Wishlist.findById(id);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (wishlist.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this wishlist',
      });
    }

    // Check if listing already exists
    const existingListing = wishlist.listings.find(
      (item) => item.listingId === listingId
    );

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: 'Listing already in wishlist',
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

    wishlist.listings.push({
      listingId,
      notes,
      addedAt: new Date(),
    });

    await wishlist.save();

    await eventBus.publish('wishlist.listing.added', {
      wishlistId: wishlist._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing added to wishlist: ${listingId} -> ${wishlist._id}`);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    logger.error('Error adding listing to wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Remove listing from wishlist
exports.removeListingFromWishlist = async (req, res) => {
  try {
    const { id, listingId } = req.params;

    const wishlist = await Wishlist.findById(id);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found',
      });
    }

    // Check ownership
    if (wishlist.user !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this wishlist',
      });
    }

    // Remove listing
    wishlist.listings = wishlist.listings.filter(
      (item) => item.listingId !== listingId
    );

    await wishlist.save();

    await eventBus.publish('wishlist.listing.removed', {
      wishlistId: wishlist._id,
      userId: req.user.id,
      listingId,
    });

    logger.info(`Listing removed from wishlist: ${listingId} <- ${wishlist._id}`);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    logger.error('Error removing listing from wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Check if listing is in any wishlist
exports.checkListingInWishlists = async (req, res) => {
  try {
    const { listingId } = req.params;

    const wishlists = await Wishlist.find({
      user: req.user.id,
      'listings.listingId': listingId,
    }).select('_id name').lean();

    res.json({
      success: true,
      inWishlists: wishlists.length > 0,
      wishlists,
    });
  } catch (error) {
    logger.error('Error checking listing in wishlists:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
