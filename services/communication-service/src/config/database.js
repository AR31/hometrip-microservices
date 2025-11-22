const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb+srv://arwakhlifi31:bjR7XvPaL3savRmt@cluster0.hxvjyu7.mongodb.net/communication_db?retryWrites=true&w=majority&appName=Cluster0";

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: "majority"
    });

    logger.info(`MongoDB connected to communication_db`);

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("error", (error) => {
      logger.error(`MongoDB connection error: ${error.message}`);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    logger.warn('Service will continue without database connection');
    return null;
  }
};

module.exports = connectDB;
