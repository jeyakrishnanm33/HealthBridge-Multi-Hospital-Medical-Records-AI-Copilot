const { isDBConnected } = require('../config/database');

/**
 * Service to retrieve system health status, uptime, and database connectivity.
 */
const getHealthStatus = () => {
  const dbConnected = isDBConnected();

  return {
    status: 'ok',
    service: 'healthbridge-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(2)),
    database: {
      status: dbConnected ? 'connected' : 'disconnected',
      connected: dbConnected,
    },
  };
};

module.exports = {
  getHealthStatus,
};
