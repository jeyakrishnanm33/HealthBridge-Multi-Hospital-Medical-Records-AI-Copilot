const hospitalService = require('../services/hospitalService');

/**
 * POST /api/hospitals
 * Registers a new hospital in PENDING status.
 * Requires authenticated user.
 */
const createHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.createHospital({
      data: req.body,
      registeredByUserId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        hospital,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hospitals
 * Lists hospitals with optional status filter.
 */
const getHospitals = async (req, res, next) => {
  try {
    const hospitals = await hospitalService.getHospitals(req.query);

    res.status(200).json({
      success: true,
      data: {
        hospitals,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hospitals/:id
 * Retrieves details for a specific hospital.
 */
const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        hospital,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/hospitals/:id/status
 * Updates hospital lifecycle status (APPROVED, REJECTED, SUSPENDED).
 * Requires authenticated SYSTEM_ADMIN.
 */
const updateHospitalStatus = async (req, res, next) => {
  try {
    const hospital = await hospitalService.updateHospitalStatus({
      hospitalId: req.params.id,
      newStatus: req.body.status,
    });

    res.status(200).json({
      success: true,
      data: {
        hospital,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHospital,
  getHospitals,
  getHospitalById,
  updateHospitalStatus,
};
