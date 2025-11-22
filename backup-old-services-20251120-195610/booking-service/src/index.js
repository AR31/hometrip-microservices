const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { validationResult } = require("express-validator");

const config = require("./config");
const { connectDB } = require("./config/database");
const logger = require("./utils/logger");
const eventBus = require("./utils/eventBus");
const bookingRoutes = require("./routes/bookings");


// Swagger Documentation
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');
const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg) } }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// CORS
app.use(cors({
  origin: config.CORS_ORIGIN.split(","),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: "Too many requests, please try again later"
});
app.use("/api/", limiter);

// Validation error handler middleware
app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array()
    });
  }
  next();
});

// Routes
app.use("/api/bookings", bookingRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "booking-service",
    timestamp: new Date(),
    version: config.SERVICE_VERSION
  });
});

// Info endpoint
app.get("/info", (req, res) => {
  res.json({
    service: "booking-service",
    version: config.SERVICE_VERSION,
    environment: config.NODE_ENV
  });
});


// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: Interactive API documentation using Swagger UI
 *     tags: [Documentation]
 */
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(config.NODE_ENV === "development" && { stack: err.stack })
  });
});

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to event bus
    await eventBus.connect();

    // Subscribe to payment events
    await eventBus.subscribe("payment.succeeded", handlePaymentSucceeded);
    await eventBus.subscribe("payment.failed", handlePaymentFailed);

    // Start server
    const PORT = config.PORT;
    const server = app.listen(PORT, config.SERVICE_HOST, () => {
      logger.info(`Booking Service started on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Service Version: ${config.SERVICE_VERSION}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info("Graceful shutdown initiated");

      server.close(async () => {
        try {
          await eventBus.disconnect();
          logger.info("All connections closed");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

/**
 * Event handler: Payment succeeded
 * Confirm the booking when payment is successful
 */
async function handlePaymentSucceeded(data) {
  try {
    const Reservation = require("./models/Reservation");

    logger.info("Payment succeeded event received:", data);

    const { reservationId, paymentIntentId } = data;

    // Update reservation
    const reservation = await Reservation.findByIdAndUpdate(
      reservationId,
      {
        paymentIntentId,
        paymentStatus: "paid",
        status: "confirmed",
        confirmedAt: new Date()
      },
      { new: true }
    );

    if (reservation) {
      // Publish confirmation event
      await eventBus.publish("booking.confirmed", {
        reservationId: reservation._id,
        userId: reservation.user,
        hostId: reservation.host,
        listingId: reservation.listing,
        total: reservation.pricing.total,
        timestamp: new Date()
      });

      logger.info(`Booking confirmed for reservation: ${reservationId}`);
    }
  } catch (error) {
    logger.error("Error handling payment succeeded:", error);
  }
}

/**
 * Event handler: Payment failed
 * Cancel the booking when payment fails
 */
async function handlePaymentFailed(data) {
  try {
    const Reservation = require("./models/Reservation");

    logger.info("Payment failed event received:", data);

    const { reservationId, reason } = data;

    // Update reservation
    const reservation = await Reservation.findByIdAndUpdate(
      reservationId,
      {
        paymentStatus: "failed",
        status: "cancelled",
        cancellation: {
          cancelledAt: new Date(),
          reason: reason || "Payment failed"
        }
      },
      { new: true }
    );

    if (reservation) {
      // Publish cancellation event
      await eventBus.publish("booking.cancelled", {
        reservationId: reservation._id,
        userId: reservation.user,
        hostId: reservation.host,
        reason: reason || "Payment failed",
        timestamp: new Date()
      });

      logger.info(`Booking cancelled for reservation: ${reservationId}`);
    }
  } catch (error) {
    logger.error("Error handling payment failed:", error);
  }
}

// Start server
startServer();

module.exports = app;
