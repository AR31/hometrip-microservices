const Reservation = require("../models/Reservation");
const eventBus = require("../utils/eventBus");
const logger = require("../utils/logger");
const axios = require("axios");
const moment = require("moment");

/**
 * Create a new reservation
 */
exports.createReservation = async (req, res) => {
  try {
    const {
      listingId,
      startDate,
      endDate,
      numberOfGuests,
      specialRequests,
      pricing,
      cancellationPolicy
    } = req.body;

    // Validate required fields
    if (!listingId || !startDate || !endDate || !numberOfGuests || !pricing) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const userId = req.user.id;

    // Get listing details from listing service
    let listing;
    try {
      const listingResponse = await axios.get(
        `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}`
      );
      listing = listingResponse.data;
    } catch (error) {
      logger.error("Error fetching listing:", error.message);
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }

    // Check if user is trying to book their own listing
    if (listing.host.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot book your own listing"
      });
    }

    // Check availability
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return res.status(400).json({
        success: false,
        message: "Stay must be at least 1 night"
      });
    }

    // Check for overlapping reservations
    const overlappingReservations = await Reservation.countDocuments({
      listing: listingId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startDate: { $lte: start }, endDate: { $gte: start } },
        { startDate: { $lte: end }, endDate: { $gte: end } },
        { startDate: { $gte: start }, endDate: { $lte: end } }
      ]
    });

    if (overlappingReservations > 0) {
      return res.status(400).json({
        success: false,
        message: "Property already booked for these dates"
      });
    }

    // Create reservation
    const reservation = new Reservation({
      listing: listingId,
      user: userId,
      host: listing.host,
      startDate: start,
      endDate: end,
      numberOfNights: nights,
      numberOfGuests: {
        adults: numberOfGuests.adults || numberOfGuests,
        children: numberOfGuests.children || 0,
        infants: numberOfGuests.infants || 0
      },
      pricing: {
        nightlyRate: pricing.nightlyRate || listing.price,
        numberOfNights: nights,
        subtotal: pricing.subtotal,
        cleaningFee: pricing.cleaningFee || 0,
        serviceFee: pricing.serviceFee,
        taxes: pricing.taxes || 0,
        total: pricing.total
      },
      status: listing.instantBooking ? "confirmed" : "pending",
      specialRequests,
      cancellationPolicy: cancellationPolicy || listing.cancellationPolicy || "moderate",
      paymentStatus: "pending"
    });

    if (listing.instantBooking) {
      reservation.confirmedAt = new Date();
    }

    await reservation.save();

    // Populate reference data
    await reservation.populate([
      { path: "listing", select: "title images address price" },
      { path: "host", select: "fullName email" }
    ]);

    // Publish booking created event
    eventBus.publish("booking.created", {
      reservationId: reservation._id,
      userId,
      hostId: reservation.host._id,
      listingId,
      status: reservation.status,
      total: pricing.total,
      startDate,
      endDate,
      timestamp: new Date()
    });

    logger.info(`Reservation created: ${reservation._id}`);

    res.status(201).json({
      success: true,
      message: listing.instantBooking
        ? "Booking confirmed! Check your email for confirmation."
        : "Booking request sent. Host will respond shortly.",
      reservation,
      isInstantBook: listing.instantBooking
    });
  } catch (error) {
    logger.error("Error creating reservation:", error);
    res.status(500).json({
      success: false,
      message: "Error creating reservation",
      error: error.message
    });
  }
};

/**
 * Get all reservations for a user
 */
exports.getUserReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, role } = req.query;

    let filter = {};

    // Filter by role (guest or host)
    if (role === "host") {
      filter.host = userId;
    } else {
      filter.user = userId;
    }

    // Filter by status if provided
    if (status) {
      filter.status = status;
    }

    const reservations = await Reservation.find(filter)
      .populate("listing", "title images address price")
      .populate("host", "fullName email avatar")
      .populate("user", "fullName email avatar")
      .sort({ createdAt: -1 });

    logger.info(`Retrieved ${reservations.length} reservations for user: ${userId}`);

    res.json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    logger.error("Error fetching reservations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reservations",
      error: error.message
    });
  }
};

/**
 * Get a specific reservation by ID
 */
exports.getReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await Reservation.findById(id)
      .populate("listing", "title images address price description")
      .populate("host", "fullName email avatar")
      .populate("user", "fullName email avatar phone");

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    // Check if user is authorized to view this reservation
    if (
      reservation.user._id.toString() !== userId &&
      reservation.host._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this reservation"
      });
    }

    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    logger.error("Error fetching reservation:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reservation",
      error: error.message
    });
  }
};

/**
 * Update a reservation
 */
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    // Only allow updates to pending reservations
    if (reservation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a non-pending reservation"
      });
    }

    // Only the guest can update special requests
    if (reservation.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this reservation"
      });
    }

    // Update allowed fields
    if (updates.specialRequests) {
      reservation.specialRequests = updates.specialRequests;
    }

    await reservation.save();

    logger.info(`Reservation updated: ${id}`);

    res.json({
      success: true,
      message: "Reservation updated",
      reservation
    });
  } catch (error) {
    logger.error("Error updating reservation:", error);
    res.status(500).json({
      success: false,
      message: "Error updating reservation",
      error: error.message
    });
  }
};

/**
 * Cancel a reservation
 */
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id).populate("user").populate("host");

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    // Check authorization
    const isGuest = reservation.user._id.toString() === userId;
    const isHost = reservation.host._id.toString() === userId;

    if (!isGuest && !isHost) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this reservation"
      });
    }

    // Check if cancellation is allowed
    if (reservation.status === "completed" || reservation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${reservation.status} reservation`
      });
    }

    // Calculate refund based on cancellation policy
    const refundAmount = calculateRefund(
      reservation.pricing.total,
      reservation.cancellationPolicy,
      reservation.startDate
    );

    // Update reservation
    reservation.status = "cancelled";
    reservation.cancellation = {
      cancelledBy: userId,
      cancelledAt: new Date(),
      reason: reason || "Cancelled by user",
      refundAmount
    };

    await reservation.save();

    // Publish cancellation event
    eventBus.publish("booking.cancelled", {
      reservationId: reservation._id,
      userId: isGuest ? reservation.user._id : reservation.host._id,
      hostId: reservation.host._id,
      refundAmount,
      reason: reason || "Cancelled by user",
      timestamp: new Date()
    });

    logger.info(`Reservation cancelled: ${id}, refund: ${refundAmount}`);

    res.json({
      success: true,
      message: "Reservation cancelled",
      reservation,
      refundAmount
    });
  } catch (error) {
    logger.error("Error cancelling reservation:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling reservation",
      error: error.message
    });
  }
};

/**
 * Check availability for a listing
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { listingId, startDate, endDate } = req.query;

    if (!listingId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for overlapping reservations
    const overlappingReservations = await Reservation.countDocuments({
      listing: listingId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startDate: { $lte: start }, endDate: { $gte: start } },
        { startDate: { $lte: end }, endDate: { $gte: end } },
        { startDate: { $gte: start }, endDate: { $lte: end } }
      ]
    });

    const isAvailable = overlappingReservations === 0;

    res.json({
      success: true,
      available: isAvailable,
      overlappingCount: overlappingReservations,
      reason: isAvailable ? null : "Property already booked for these dates"
    });
  } catch (error) {
    logger.error("Error checking availability:", error);
    res.status(500).json({
      success: false,
      message: "Error checking availability",
      error: error.message
    });
  }
};

/**
 * Calculate total price for a booking
 */
exports.calculatePrice = async (req, res) => {
  try {
    const {
      listingId,
      startDate,
      endDate,
      numberOfGuests,
      couponCode
    } = req.body;

    if (!listingId || !startDate || !endDate || !numberOfGuests) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Get listing from listing service
    let listing;
    try {
      const response = await axios.get(
        `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}`
      );
      listing = response.data;
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return res.status(400).json({
        success: false,
        message: "Stay must be at least 1 night"
      });
    }

    // Calculate base price with seasonal pricing
    let totalNightlyRate = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);

      // Check custom pricing
      const customPrice = listing.customPricing?.find(
        cp => new Date(cp.date).toDateString() === currentDate.toDateString()
      );

      if (customPrice) {
        totalNightlyRate += customPrice.pricePerNight;
        continue;
      }

      // Check seasonal pricing
      const seasonalPrice = listing.seasonalPricing?.find(sp => {
        const seasonStart = new Date(sp.startDate);
        const seasonEnd = new Date(sp.endDate);
        return currentDate >= seasonStart && currentDate <= seasonEnd;
      });

      totalNightlyRate += seasonalPrice ? seasonalPrice.pricePerNight : listing.price;
    }

    let subtotal = totalNightlyRate;

    // Apply long-stay discounts
    let discount = 0;
    let discountType = null;

    if (listing.discounts) {
      if (nights >= 28 && listing.discounts.monthly > 0) {
        discount = (subtotal * listing.discounts.monthly) / 100;
        discountType = "monthly";
      } else if (nights >= 7 && listing.discounts.weekly > 0) {
        discount = (subtotal * listing.discounts.weekly) / 100;
        discountType = "weekly";
      }
    }

    subtotal -= discount;

    // Add fees
    const cleaningFee = listing.cleaningFee || 0;
    const serviceFee = subtotal * 0.12; // 12% service fee
    let total = subtotal + cleaningFee + serviceFee;

    // Apply coupon if provided
    let couponDiscount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      try {
        const couponResponse = await axios.get(
          `${process.env.COUPON_SERVICE_URL}/api/coupons/${couponCode}`
        );
        const coupon = couponResponse.data;

        if (coupon.isValid && coupon.discountPercentage) {
          couponDiscount = (subtotal * coupon.discountPercentage) / 100;
          total -= couponDiscount;
          appliedCoupon = {
            id: coupon._id,
            code: coupon.code,
            discount: couponDiscount
          };
        }
      } catch (error) {
        logger.warn("Coupon validation failed:", error.message);
      }
    }

    res.json({
      success: true,
      pricing: {
        nightlyRate: listing.price,
        numberOfNights: nights,
        subtotal: totalNightlyRate,
        discount,
        discountType,
        cleaningFee,
        serviceFee,
        couponDiscount,
        total,
        appliedCoupon
      }
    });
  } catch (error) {
    logger.error("Error calculating price:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating price",
      error: error.message
    });
  }
};

/**
 * Confirm payment and update reservation
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { reservationId, paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!reservationId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const reservation = await Reservation.findById(reservationId)
      .populate("listing", "title host")
      .populate("user", "fullName email");

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    // Verify authorization
    if (reservation.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Update payment status
    reservation.paymentIntentId = paymentIntentId;
    reservation.paymentStatus = "paid";
    reservation.status = "confirmed";
    reservation.confirmedAt = new Date();

    await reservation.save();

    // Publish confirmation event
    eventBus.publish("booking.confirmed", {
      reservationId: reservation._id,
      userId: reservation.user._id,
      hostId: reservation.host,
      listingId: reservation.listing._id,
      paymentIntentId,
      total: reservation.pricing.total,
      timestamp: new Date()
    });

    logger.info(`Payment confirmed for reservation: ${reservationId}`);

    res.json({
      success: true,
      message: "Payment confirmed",
      reservation
    });
  } catch (error) {
    logger.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming payment",
      error: error.message
    });
  }
};

/**
 * Mark reservation as completed
 */
exports.completeReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    // Only host can complete
    if (reservation.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only host can complete booking"
      });
    }

    if (reservation.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed reservations can be completed"
      });
    }

    reservation.status = "completed";
    reservation.completedAt = new Date();
    await reservation.save();

    // Publish completion event
    eventBus.publish("booking.completed", {
      reservationId: reservation._id,
      userId: reservation.user,
      hostId: reservation.host,
      timestamp: new Date()
    });

    logger.info(`Reservation completed: ${id}`);

    res.json({
      success: true,
      message: "Reservation completed",
      reservation
    });
  } catch (error) {
    logger.error("Error completing reservation:", error);
    res.status(500).json({
      success: false,
      message: "Error completing reservation",
      error: error.message
    });
  }
};

/**
 * Accept a pending booking request (Host)
 */
exports.acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    if (reservation.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only host can accept bookings"
      });
    }

    if (reservation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending reservations can be accepted"
      });
    }

    reservation.status = "confirmed";
    reservation.confirmedAt = new Date();
    await reservation.save();

    logger.info(`Booking accepted: ${id}`);

    res.json({
      success: true,
      message: "Booking accepted",
      reservation
    });
  } catch (error) {
    logger.error("Error accepting booking:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting booking",
      error: error.message
    });
  }
};

/**
 * Decline a pending booking request (Host)
 */
exports.declineBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    if (reservation.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only host can decline bookings"
      });
    }

    if (reservation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending reservations can be declined"
      });
    }

    reservation.status = "declined";
    reservation.cancellation = {
      cancelledBy: userId,
      cancelledAt: new Date(),
      reason: reason || "Declined by host"
    };
    await reservation.save();

    // Publish cancellation event
    eventBus.publish("booking.cancelled", {
      reservationId: reservation._id,
      userId: reservation.user,
      hostId: reservation.host,
      reason: reason || "Declined by host",
      timestamp: new Date()
    });

    logger.info(`Booking declined: ${id}`);

    res.json({
      success: true,
      message: "Booking declined",
      reservation
    });
  } catch (error) {
    logger.error("Error declining booking:", error);
    res.status(500).json({
      success: false,
      message: "Error declining booking",
      error: error.message
    });
  }
};

/**
 * Helper function to calculate refund based on cancellation policy
 */
function calculateRefund(totalAmount, policy, startDate) {
  const now = new Date();
  const daysUntilCheckIn = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

  switch (policy) {
    case "flexible":
      return totalAmount; // Full refund
    case "moderate":
      if (daysUntilCheckIn > 7) return totalAmount; // Full refund if 7+ days
      if (daysUntilCheckIn > 3) return totalAmount * 0.5; // 50% refund if 3-7 days
      return 0; // No refund if less than 3 days
    case "strict":
      if (daysUntilCheckIn > 14) return totalAmount; // Full refund if 14+ days
      if (daysUntilCheckIn > 7) return totalAmount * 0.5; // 50% refund if 7-14 days
      return 0; // No refund if less than 7 days
    case "super_strict":
      if (daysUntilCheckIn > 30) return totalAmount; // Full refund if 30+ days
      return 0; // No refund otherwise
    default:
      return 0;
  }
}

module.exports = exports;
