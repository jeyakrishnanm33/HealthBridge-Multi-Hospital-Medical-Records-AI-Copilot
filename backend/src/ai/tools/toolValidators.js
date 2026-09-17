const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

const getRecentVisitsSchema = z.object({
  patientId: objectIdSchema,
  limit: z.coerce.number().int().min(1).max(50).default(5),
  status: z.string().optional(),
});

const getDiagnosesSchema = z.object({
  patientId: objectIdSchema,
  status: z.enum(['PROVISIONAL', 'CONFIRMED', 'RESOLVED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const getMedicationsSchema = z.object({
  patientId: objectIdSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISCONTINUED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const getLabResultsSchema = z.object({
  patientId: objectIdSchema,
  testName: z.string().optional(),
  interpretation: z.enum(['NORMAL', 'ABNORMAL', 'CRITICAL']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const getPrescriptionsSchema = z.object({
  patientId: objectIdSchema,
  status: z.enum(['ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const getClinicalTimelineSchema = z.object({
  patientId: objectIdSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  recordTypes: z
    .array(z.enum(['VISIT', 'DIAGNOSIS', 'MEDICATION', 'LAB_RESULT', 'PRESCRIPTION', 'DOCUMENT']))
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const toolValidators = {
  get_recent_visits: getRecentVisitsSchema,
  get_diagnoses: getDiagnosesSchema,
  get_medications: getMedicationsSchema,
  get_lab_results: getLabResultsSchema,
  get_prescriptions: getPrescriptionsSchema,
  get_clinical_timeline: getClinicalTimelineSchema,
};

module.exports = {
  toolValidators,
  getRecentVisitsSchema,
  getDiagnosesSchema,
  getMedicationsSchema,
  getLabResultsSchema,
  getPrescriptionsSchema,
  getClinicalTimelineSchema,
};
