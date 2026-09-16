/**
 * Semantic Clinical Search Controller
 */
const { searchClinicalSchema } = require('../validators/searchValidators');
const searchService = require('../services/searchService');

/**
 * POST /api/search/clinical
 * Execute semantic search on clinical medical records
 */
const searchClinical = async (req, res, next) => {
  try {
    const validatedData = searchClinicalSchema.parse(req.body);
    const result = await searchService.searchClinicalRecords({
      user: req.user,
      searchParams: validatedData,
      clientMeta: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Clinical search completed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchClinical,
};
