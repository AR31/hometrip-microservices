const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/booking_db";

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info("MongoDB connected successfully");
    logger.info(`Connected to: ${mongoURI}`);

    // Handle connection events
    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB connection lost");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error.message);
    // Retry connection
    setTimeout(connectDB, 5000);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("Error disconnecting from MongoDB:", error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
