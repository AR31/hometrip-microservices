const Listing = require("../models/Listing");
const eventBus = require("../utils/eventBus");
const logger = require("../utils/logger");
const cloudinary = require("../utils/cloudinary");

const SERVICE_FEE_RATE = 0.14;
const FIXED_TAXES = 5;

/**
 * Normalize address string
 */
function normalizeAddress(str = "") {
  return str
    .replace(/\bbd\b/gi, "boulevard")
    .replace(/\bav\b/gi, "avenue")
    .replace(/\brte\b/gi, "route")
    .replace(/\bd\b/gi, "de")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get coordinates from address using OpenStreetMap Nominatim
 */
async function getCoordinatesFromAddress(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    const data = await res.json();
    if (!data || data.length === 0) return { lat: null, lng: null };
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (error) {
    logger.error("Error getting coordinates:", error);
    return { lat: null, lng: null };
  }
}

/**
 * Create a new listing
 */
const createListing = async (req, res) => {
  try {
    const { address, structure, propertyType, price, images } = req.body;

    // Validation
    if (!structure) {
      return res.status(400).json({ error: "La structure du logement est requise." });
    }
    if (!propertyType || !["entire", "private", "shared"].includes(propertyType)) {
      return res.status(400).json({ error: "Type de logement invalide ou manquant." });
    }
    if (!price || typeof price !== "number") {
      return res.status(400).json({ error: "Le prix de base est requis et doit être un nombre." });
    }
    if (!address) {
      return res.status(400).json({ error: "Aucune adresse reçue." });
    }

    const { street, postalCode, city, country = "France", fullAddress } = address;
    if (!street || !postalCode || !city) {
      return res.status(400).json({ error: "Tous les champs d'adresse sont requis." });
    }

    // Construct address
    const constructedAddress = fullAddress ||
      `${normalizeAddress(street)}, ${postalCode} ${normalizeAddress(city)}, ${normalizeAddress(country)}`;

    // Get coordinates
    const coords = await getCoordinatesFromAddress(constructedAddress);
    if (!coords.lat || !coords.lng) {
      return res.status(400).json({ error: "Adresse introuvable. Vérifiez l'adresse." });
    }

    // Process images
    let imageUrls = [];
    if (Array.isArray(images)) {
      imageUrls = images.map(img => typeof img === "string" ? img : img?.url).filter(Boolean);
    }

    // Calculate fees
    const serviceFee = Math.round(price * SERVICE_FEE_RATE);
    const totalWithFees = price + serviceFee + FIXED_TAXES;

    // Create listing
    const newListing = new Listing({
      ...req.body,
      images: imageUrls,
      host: req.user.id,
      location: constructedAddress,
      lat: coords.lat,
      lng: coords.lng,
      serviceFee,
      totalWithFees,
      isActive: false,
      isPublished: false
    });

    const saved = await newListing.save();

    // Publish event
    await eventBus.publish("listing.created", {
      listingId: saved._id,
      host: saved.host,
      title: saved.title,
      price: saved.price,
      timestamp: new Date()
    });

    logger.info(`Listing created: ${saved._id} by host ${saved.host}`);
    res.status(201).json(saved);
  } catch (err) {
    logger.error("Error creating listing:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

/**
 * Get all listings with advanced filtering
 */
const searchListings = async (req, res) => {
  try {
    logger.debug("Search listings received:", req.query);

    const {
      location = "",
      checkIn = "",
      checkOut = "",
      guests = 1,
      minPrice = 0,
      maxPrice = 10000,
      structure = "",
      propertyType = "",
      minBedrooms = 0,
      minBathrooms = 0,
      minRating = 0,
      page = 1,
      limit = 20,
      sortBy = "newest"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    let filter = {
      isActive: true,
      isPublished: true
    };

    // Location filter
    if (location && location.trim()) {
      const locationRegex = new RegExp(location.trim(), "i");
      filter.$or = [
        { "address.city": locationRegex },
        { "address.country": locationRegex },
        { "address.street": locationRegex },
        { title: locationRegex },
        { location: locationRegex }
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {
        $gte: Math.max(0, parseInt(minPrice) || 0),
        $lte: Math.max(1, parseInt(maxPrice) || 10000)
      };
    }

    // Guests filter
    if (guests) {
      filter.guests = { $gte: parseInt(guests) || 1 };
    }

    // Structure filter
    if (structure && structure.trim()) {
      filter.structure = structure.trim();
    }

    // Property type filter
    if (propertyType && propertyType.trim()) {
      filter.propertyType = propertyType.trim();
    }

    // Bedrooms filter
    if (minBedrooms) {
      filter.bedrooms = { $gte: parseInt(minBedrooms) || 0 };
    }

    // Bathrooms filter
    if (minBathrooms) {
      filter.bathrooms = { $gte: parseInt(minBathrooms) || 0 };
    }

    // Rating filter
    if (minRating) {
      filter.averageRating = { $gte: parseFloat(minRating) || 0 };
    }

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case "price-asc":
        sortOptions = { price: 1 };
        break;
      case "price-desc":
        sortOptions = { price: -1 };
        break;
      case "rating":
        sortOptions = { averageRating: -1, reviewCount: -1 };
        break;
      case "newest":
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Execute query
    const listings = await Listing.find(filter)
      .populate("host", "fullName email avatar isSuperhost")
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await Listing.countDocuments(filter);
    const pages = Math.ceil(total / limitNum);

    logger.debug(`Found ${listings.length} listings`);

    res.json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages,
          hasNextPage: pageNum < pages,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (err) {
    logger.error("Error searching listings:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get listing by ID
 */
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("host", "fullName email avatar isSuperhost");

    if (!listing) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    res.json(listing);
  } catch (err) {
    logger.error("Error getting listing:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get host's listings
 */
const getHostListings = async (req, res) => {
  try {
    const listings = await Listing.find({ host: req.user.id });
    res.json(listings);
  } catch (err) {
    logger.error("Error getting host listings:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update listing
 */
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // If address is updated, recalculate coordinates
    if (req.body.address && req.body.address.street) {
      const address = req.body.address;
      const constructedAddress = address.fullAddress ||
        `${normalizeAddress(address.street)}, ${address.zipCode} ${normalizeAddress(address.city)}, ${normalizeAddress(address.country || "France")}`;

      const coords = await getCoordinatesFromAddress(constructedAddress);
      if (coords.lat && coords.lng) {
        req.body.location = constructedAddress;
        req.body.lat = coords.lat;
        req.body.lng = coords.lng;
      }
    }

    // If price is updated, recalculate fees
    if (req.body.price) {
      const serviceFee = Math.round(req.body.price * SERVICE_FEE_RATE);
      const totalWithFees = req.body.price + serviceFee + FIXED_TAXES;
      req.body.serviceFee = serviceFee;
      req.body.totalWithFees = totalWithFees;
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Publish event
    await eventBus.publish("listing.updated", {
      listingId: updated._id,
      host: updated.host,
      title: updated.title,
      timestamp: new Date()
    });

    logger.info(`Listing updated: ${updated._id}`);
    res.json(updated);
  } catch (err) {
    logger.error("Error updating listing:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Toggle listing active status
 */
const toggleActive = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    listing.isActive = !listing.isActive;
    await listing.save();

    // Publish event
    const eventName = listing.isActive ? "listing.published" : "listing.unpublished";
    await eventBus.publish(eventName, {
      listingId: listing._id,
      host: listing.host,
      title: listing.title,
      timestamp: new Date()
    });

    logger.info(`Listing toggled: ${listing._id} - Active: ${listing.isActive}`);

    res.json({
      message: listing.isActive ? "Annonce activée" : "Annonce désactivée",
      isActive: listing.isActive,
      listing
    });
  } catch (err) {
    logger.error("Error toggling listing:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete listing
 */
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (!listing.host || listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès interdit" });
    }

    // Delete images from Cloudinary
    if (listing.images && listing.images.length > 0) {
      for (const imageUrl of listing.images) {
        try {
          await cloudinary.deleteImage(imageUrl);
        } catch (error) {
          logger.warn(`Failed to delete image from Cloudinary: ${imageUrl}`);
        }
      }
    }

    await listing.deleteOne();

    // Publish event
    await eventBus.publish("listing.deleted", {
      listingId: listing._id,
      host: listing.host,
      title: listing.title,
      timestamp: new Date()
    });

    logger.info(`Listing deleted: ${listing._id}`);
    res.json({ message: "Annonce supprimée avec succès" });
  } catch (err) {
    logger.error("Error deleting listing:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Upload listing photos
 */
const uploadPhotos = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      try {
        const result = await cloudinary.uploadImage(file.buffer, {
          folder: `listings/${listing._id}`,
          resource_type: "auto"
        });
        uploadedUrls.push(result.secure_url);
      } catch (error) {
        logger.error("Error uploading to Cloudinary:", error);
      }
    }

    // Add to listing images
    listing.images = [...(listing.images || []), ...uploadedUrls];
    await listing.save();

    logger.info(`Photos uploaded for listing ${listing._id}`);
    res.json({
      message: "Photos téléchargées avec succès",
      images: uploadedUrls,
      listing
    });
  } catch (err) {
    logger.error("Error uploading photos:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete listing photo
 */
const deletePhoto = async (req, res) => {
  try {
    const { listingId, imageUrl } = req.params;

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Remove from Cloudinary
    try {
      await cloudinary.deleteImage(imageUrl);
    } catch (error) {
      logger.warn(`Failed to delete image from Cloudinary: ${imageUrl}`);
    }

    // Remove from listing
    listing.images = listing.images.filter(img => img !== imageUrl);
    await listing.save();

    logger.info(`Photo deleted from listing ${listing._id}`);
    res.json({ message: "Photo supprimée avec succès" });
  } catch (err) {
    logger.error("Error deleting photo:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get listing availability
 */
const getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    // Check blocked dates
    const blockedDates = listing.blockedDates.filter(blocked => {
      const blockStart = new Date(blocked.startDate);
      const blockEnd = new Date(blocked.endDate);
      const start = new Date(startDate);
      const end = new Date(endDate);

      return blockStart < end && blockEnd > start;
    });

    res.json({
      listingId: listing._id,
      available: blockedDates.length === 0,
      blockedDates
    });
  } catch (err) {
    logger.error("Error getting availability:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Block dates
 */
const blockDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (listing.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    listing.blockedDates.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });

    await listing.save();

    logger.info(`Dates blocked for listing ${listing._id}`);
    res.json({ message: "Dates bloquées avec succès", listing });
  } catch (err) {
    logger.error("Error blocking dates:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createListing,
  searchListings,
  getListingById,
  getHostListings,
  updateListing,
  toggleActive,
  deleteListing,
  uploadPhotos,
  deletePhoto,
  getAvailability,
  blockDates
};
