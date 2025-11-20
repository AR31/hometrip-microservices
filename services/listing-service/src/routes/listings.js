const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const authMiddleware = require("../middleware/auth");
const {
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
} = require("../controllers/listingController");

const router = express.Router();

// Multer configuration for photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

/**
 * Create a new listing
 */
router.post(
  "/",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("structure").notEmpty().withMessage("Structure is required"),
    body("propertyType").isIn(["entire", "private", "shared"]).withMessage("Invalid property type"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("address.street").notEmpty().withMessage("Street is required"),
    body("address.zipCode").notEmpty().withMessage("Zip code is required"),
    body("address.city").notEmpty().withMessage("City is required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    createListing(req, res);
  }
);

/**
 * Search listings
 */
router.get("/search", searchListings);

/**
 * Get all public listings
 */
router.get("/", searchListings);

/**
 * Get host's listings
 */
router.get("/my-listings", authMiddleware, getHostListings);

/**
 * Get listing by ID
 */
router.get("/:id", getListingById);

/**
 * Update listing
 */
router.put(
  "/:id",
  authMiddleware,
  async (req, res) => {
    updateListing(req, res);
  }
);

/**
 * Toggle listing active status
 */
router.patch("/:id/toggle-active", authMiddleware, toggleActive);

/**
 * Delete listing
 */
router.delete("/:id", authMiddleware, deleteListing);

/**
 * Upload photos
 */
router.post(
  "/:id/photos",
  authMiddleware,
  upload.array("photos", 10),
  uploadPhotos
);

/**
 * Delete photo
 */
router.delete("/:listingId/photos/:imageUrl", authMiddleware, deletePhoto);

/**
 * Get availability
 */
router.get("/:id/availability", getAvailability);

/**
 * Block dates
 */
router.post(
  "/:id/block-dates",
  authMiddleware,
  [
    body("startDate").isISO8601().withMessage("Invalid start date"),
    body("endDate").isISO8601().withMessage("Invalid end date")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    blockDates(req, res);
  }
);

module.exports = router;
