const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    // 1. Establish MongoDB connection
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // 2. Start HTTP listener
    server = app.listen(env.PORT, () => {
      logger.info(`HealthBridge API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`Allowed Client Origin: ${env.CLIENT_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await disconnectDB();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnect:', err.message);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
