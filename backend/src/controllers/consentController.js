const consentService = require('../services/consentService');

const listConsents = async (req, res, next) => {
  try {
    const result = await consentService.listConsents({
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

const getConsentById = async (req, res, next) => {
  try {
    const consent = await consentService.getConsentById({
      consentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { consent },
    });
  } catch (err) {
    next(err);
  }
};

const revokeConsent = async (req, res, next) => {
  try {
    const consent = await consentService.revokeConsent({
      consentId: req.params.id,
      user: req.user,
      reason: req.body?.reason,
    });

    res.status(200).json({
      success: true,
      message: 'Consent revoked successfully',
      data: { consent },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listConsents,
  getConsentById,
  revokeConsent,
};
