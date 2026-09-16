const accessRequestService = require('../services/accessRequestService');

const createAccessRequest = async (req, res, next) => {
  try {
    const accessRequest = await accessRequestService.createAccessRequest({
      user: req.user,
      patientId: req.body.patientId,
      sourceHospitalId: req.body.sourceHospitalId,
      requestingHospitalId: req.body.requestingHospitalId,
      requestedScopes: req.body.requestedScopes,
      purpose: req.body.purpose,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      message: 'Cross-hospital access request created successfully',
      data: { accessRequest },
    });
  } catch (err) {
    next(err);
  }
};

const listAccessRequests = async (req, res, next) => {
  try {
    const result = await accessRequestService.listAccessRequests({
      query: req.query,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getAccessRequestById = async (req, res, next) => {
  try {
    const accessRequest = await accessRequestService.getAccessRequestById({
      accessRequestId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { accessRequest },
    });
  } catch (err) {
    next(err);
  }
};

const approveAccessRequest = async (req, res, next) => {
  try {
    const result = await accessRequestService.approveAccessRequest({
      accessRequestId: req.params.id,
      user: req.user,
      approvalData: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Access request approved and clinical consent generated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const denyAccessRequest = async (req, res, next) => {
  try {
    const accessRequest = await accessRequestService.denyAccessRequest({
      accessRequestId: req.params.id,
      user: req.user,
      reason: req.body.reason,
    });

    res.status(200).json({
      success: true,
      message: 'Access request denied',
      data: { accessRequest },
    });
  } catch (err) {
    next(err);
  }
};

const cancelAccessRequest = async (req, res, next) => {
  try {
    const accessRequest = await accessRequestService.cancelAccessRequest({
      accessRequestId: req.params.id,
      user: req.user,
      reason: req.body.reason,
    });

    res.status(200).json({
      success: true,
      message: 'Access request cancelled',
      data: { accessRequest },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAccessRequest,
  listAccessRequests,
  getAccessRequestById,
  approveAccessRequest,
  denyAccessRequest,
  cancelAccessRequest,
};
