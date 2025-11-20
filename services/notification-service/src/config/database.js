const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connecter à MongoDB
 */
const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL ||
      'mongodb://localhost:27017/hometrip-notifications';

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);

    logger.info('MongoDB connected successfully');

    // Gérer les disconnections
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Déconnecter de MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Obtenir l'état de la connexion
 */
const getConnectionStatus = () => {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    readyStateString: getReadyStateString(mongoose.connection.readyState),
  };
};

/**
 * Obtenir la description de l'état de connexion
 */
const getReadyStateString = (readyState) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[readyState] || 'Unknown';
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
};
