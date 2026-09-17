/**
 * Clinical AI Assistant Controller
 * Validates natural language questions and parameters, routing to assistant service.
 */
const { z } = require('zod');
const { askClinicalAssistant } = require('../services/clinicalAssistantService');
const { ValidationError } = require('../errors/AppError');

const askAssistantSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .min(3, 'Question must be at least 3 characters long')
    .max(500, 'Question cannot exceed 500 characters')
    .trim(),
  patientId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid patientId format')
    .optional(),
  hospitalId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hospitalId format')
    .optional(),
  recordTypes: z
    .array(
      z.enum([
        'VISIT',
        'DIAGNOSIS',
        'MEDICATION',
        'LAB_RESULT',
        'PRESCRIPTION',
        'DOCUMENT',
      ])
    )
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  topK: z.coerce.number().int().min(1).max(20).default(5),
});

/**
 * Handle POST /api/clinical-assistant/ask
 */
const askHandler = async (req, res, next) => {
  try {
    const parseResult = askAssistantSchema.safeParse(req.body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new ValidationError(`Validation failed: ${issues.join(', ')}`, 'INVALID_ASSISTANT_QUERY_INPUT');
    }

    const { question, patientId, hospitalId, recordTypes, startDate, endDate, topK } =
      parseResult.data;

    const result = await askClinicalAssistant({
      user: req.user,
      queryParams: {
        question,
        patientId,
        hospitalId,
        recordTypes,
        startDate,
        endDate,
        topK,
      },
      clientMeta: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askHandler,
};
