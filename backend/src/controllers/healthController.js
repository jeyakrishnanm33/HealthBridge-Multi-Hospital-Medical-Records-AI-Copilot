const healthService = require('../services/healthService');

/**
 * GET /api/health
 * Returns the health status of the HealthBridge backend and connected services.
 */
const getHealth = (req, res, next) => {
  try {
    const health = healthService.getHealthStatus();
    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
};
