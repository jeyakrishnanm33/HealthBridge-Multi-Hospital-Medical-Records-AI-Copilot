const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Mongoose connection state enum: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
const isDBConnected = () => mongoose.connection.readyState === 1;

const connectDB = async () => {
  try {
    // Configure event listeners before connecting
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  isDBConnected,
};
