const patientService = require('../services/patientService');

const createProfile = async (req, res, next) => {
  try {
    const patient = await patientService.createPatientProfile({
      userId: req.user.id,
      userRole: req.user.role,
      profileData: req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Patient profile created successfully',
      data: { patient },
    });
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const patient = await patientService.getMyPatientProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { patient },
    });
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const patient = await patientService.updateMyPatientProfile({
      userId: req.user.id,
      updateData: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully',
      data: { patient },
    });
  } catch (err) {
    next(err);
  }
};

const requestHospitalMembership = async (req, res, next) => {
  try {
    const membership = await patientService.requestHospitalMembership({
      userId: req.user.id,
      hospitalId: req.params.hospitalId,
    });

    res.status(201).json({
      success: true,
      message: 'Hospital membership requested successfully',
      data: { membership },
    });
  } catch (err) {
    next(err);
  }
};

const getMyHospitalMemberships = async (req, res, next) => {
  try {
    const memberships = await patientService.getMyHospitalMemberships(req.user.id);

    res.status(200).json({
      success: true,
      data: { memberships },
    });
  } catch (err) {
    next(err);
  }
};

const getHospitalMemberships = async (req, res, next) => {
  try {
    const memberships = await patientService.getHospitalMemberships({
      hospitalId: req.params.hospitalId,
      adminUser: req.user,
    });

    res.status(200).json({
      success: true,
      data: { memberships },
    });
  } catch (err) {
    next(err);
  }
};

const updateMembershipStatus = async (req, res, next) => {
  try {
    const membership = await patientService.updateMembershipStatus({
      hospitalId: req.params.hospitalId,
      membershipId: req.params.membershipId,
      newStatus: req.body.status,
      adminUser: req.user,
    });

    res.status(200).json({
      success: true,
      message: `Membership status updated to ${membership.status}`,
      data: { membership },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  requestHospitalMembership,
  getMyHospitalMemberships,
  getHospitalMemberships,
  updateMembershipStatus,
};
