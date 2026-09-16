const doctorService = require('../services/doctorService');

const createProfile = async (req, res, next) => {
  try {
    const doctor = await doctorService.createDoctorProfile({
      userId: req.user.id,
      userRole: req.user.role,
      profileData: req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully',
      data: { doctor },
    });
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const doctor = await doctorService.getMyDoctorProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { doctor },
    });
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const doctor = await doctorService.updateMyDoctorProfile({
      userId: req.user.id,
      updateData: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: { doctor },
    });
  } catch (err) {
    next(err);
  }
};

const requestHospitalAffiliation = async (req, res, next) => {
  try {
    const affiliation = await doctorService.requestHospitalAffiliation({
      userId: req.user.id,
      hospitalId: req.params.hospitalId,
      department: req.body?.department,
    });

    res.status(201).json({
      success: true,
      message: 'Hospital affiliation requested successfully',
      data: { affiliation },
    });
  } catch (err) {
    next(err);
  }
};

const getMyHospitalAffiliations = async (req, res, next) => {
  try {
    const affiliations = await doctorService.getMyHospitalAffiliations(req.user.id);

    res.status(200).json({
      success: true,
      data: { affiliations },
    });
  } catch (err) {
    next(err);
  }
};

const getHospitalDoctors = async (req, res, next) => {
  try {
    const affiliations = await doctorService.getHospitalDoctors({
      hospitalId: req.params.hospitalId,
      adminUser: req.user,
    });

    res.status(200).json({
      success: true,
      data: { affiliations },
    });
  } catch (err) {
    next(err);
  }
};

const updateDoctorAffiliationStatus = async (req, res, next) => {
  try {
    const affiliation = await doctorService.updateDoctorAffiliationStatus({
      hospitalId: req.params.hospitalId,
      affiliationId: req.params.affiliationId,
      newStatus: req.body.status,
      adminUser: req.user,
    });

    res.status(200).json({
      success: true,
      message: `Doctor affiliation status updated to ${affiliation.status}`,
      data: { affiliation },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  requestHospitalAffiliation,
  getMyHospitalAffiliations,
  getHospitalDoctors,
  updateDoctorAffiliationStatus,
};
