const assignmentService = require('../services/assignmentService');

const createAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment({
      doctorId: req.body.doctorId,
      patientId: req.body.patientId,
      hospitalId: req.body.hospitalId,
      notes: req.body.notes,
      adminUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor-patient assignment created successfully',
      data: { assignment },
    });
  } catch (err) {
    next(err);
  }
};

const listAssignments = async (req, res, next) => {
  try {
    const assignments = await assignmentService.listAssignments({
      query: req.query,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { assignments },
    });
  } catch (err) {
    next(err);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById({
      assignmentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { assignment },
    });
  } catch (err) {
    next(err);
  }
};

const endAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.endAssignment({
      assignmentId: req.params.id,
      adminUser: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Doctor-patient assignment ended successfully',
      data: { assignment },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAssignment,
  listAssignments,
  getAssignmentById,
  endAssignment,
};
