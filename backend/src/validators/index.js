const { z } = require('zod');

/**
 * Common reusable validation primitives for future domain schemas.
 * Domain-specific schemas (auth, consent, medical records) will be introduced in future phases.
 */
const commonValidators = {
  // MongoDB ObjectId string format (24 hex characters)
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),

  // Pagination query helpers
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

module.exports = {
  commonValidators,
};
