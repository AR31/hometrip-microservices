const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://hometrip:hometrip_mongo_pass@mongodb:27017/review_db?authSource=admin';

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    logger.info('MongoDB connected successfully');
    return true;
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    // Retry connection after 5 seconds
    setTimeout(() => connectDB(), 5000);
    return false;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
    return true;
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    return false;
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
