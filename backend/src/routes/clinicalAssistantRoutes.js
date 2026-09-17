/**
 * Clinical AI Assistant Routes
 * Protected endpoint for retrieval-grounded clinical question answering.
 */
const express = require('express');
const authenticate = require('../middleware/authenticate');
const { assistantRateLimiter } = require('../middleware/rateLimiter');
const { askHandler } = require('../controllers/clinicalAssistantController');


const router = express.Router();

// All assistant routes require authentication and are rate-limited
router.use(authenticate);
router.use(assistantRateLimiter);

router.post('/ask', askHandler);

module.exports = router;
