/**
 * Semantic Clinical Search Routes
 */
const express = require('express');
const searchController = require('../controllers/searchController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { searchClinicalSchema } = require('../validators/searchValidators');

const router = express.Router();

// All search endpoints require authentication
router.use(authenticate);

// Semantic Clinical Search (Doctor / Patient - Admins restricted)
router.post(
  '/clinical',
  validate({ body: searchClinicalSchema }),
  searchController.searchClinical
);

module.exports = router;
