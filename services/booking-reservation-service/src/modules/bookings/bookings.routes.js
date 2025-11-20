const express = require("express");
const router = express.Router();
const { body, query, param } = require("express-validator");
const auth = require("../middleware/auth");
const bookingController = require("../controllers/bookingController");

/**
 * POST /api/bookings
 * Create a new reservation
 */
router.post(
  "/",
  auth,
  [
    body("listingId").notEmpty().withMessage("listingId is required"),
    body("startDate").isISO8601().withMessage("Valid startDate is required"),
    body("endDate").isISO8601().withMessage("Valid endDate is required"),
    body("numberOfGuests").notEmpty().withMessage("numberOfGuests is required"),
    body("pricing").notEmpty().withMessage("pricing is required")
  ],
  bookingController.createReservation
);

/**
 * GET /api/bookings/user
 * Get all reservations for current user
 */
router.get(
  "/user",
  auth,
  [
    query("status").optional().isIn(["pending", "confirmed", "cancelled", "completed", "declined"]),
    query("role").optional().isIn(["guest", "host"])
  ],
  bookingController.getUserReservations
);

/**
 * GET /api/bookings/availability
 * Check availability for a listing
 */
router.get(
  "/availability",
  [
    query("listingId").notEmpty().withMessage("listingId is required"),
    query("startDate").isISO8601().withMessage("Valid startDate is required"),
    query("endDate").isISO8601().withMessage("Valid endDate is required")
  ],
  bookingController.checkAvailability
);

/**
 * POST /api/bookings/calculate-price
 * Calculate total price for a booking
 */
router.post(
  "/calculate-price",
  [
    body("listingId").notEmpty().withMessage("listingId is required"),
    body("startDate").isISO8601().withMessage("Valid startDate is required"),
    body("endDate").isISO8601().withMessage("Valid endDate is required"),
    body("numberOfGuests").notEmpty().withMessage("numberOfGuests is required")
  ],
  bookingController.calculatePrice
);

/**
 * POST /api/bookings/confirm-payment
 * Confirm payment and update reservation
 */
router.post(
  "/confirm-payment",
  auth,
  [
    body("reservationId").notEmpty().withMessage("reservationId is required"),
    body("paymentIntentId").notEmpty().withMessage("paymentIntentId is required")
  ],
  bookingController.confirmPayment
);

/**
 * GET /api/bookings/:id
 * Get a specific reservation
 */
router.get(
  "/:id",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.getReservation
);

/**
 * PUT /api/bookings/:id
 * Update a reservation
 */
router.put(
  "/:id",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.updateReservation
);

/**
 * POST /api/bookings/:id/cancel
 * Cancel a reservation
 */
router.post(
  "/:id/cancel",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.cancelReservation
);

/**
 * POST /api/bookings/:id/complete
 * Mark reservation as completed (Host only)
 */
router.post(
  "/:id/complete",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.completeReservation
);

/**
 * POST /api/bookings/:id/accept
 * Accept a pending booking request (Host only)
 */
router.post(
  "/:id/accept",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.acceptBooking
);

/**
 * POST /api/bookings/:id/decline
 * Decline a pending booking request (Host only)
 */
router.post(
  "/:id/decline",
  auth,
  [param("id").isMongoId().withMessage("Valid reservation ID is required")],
  bookingController.declineBooking
);

module.exports = router;
