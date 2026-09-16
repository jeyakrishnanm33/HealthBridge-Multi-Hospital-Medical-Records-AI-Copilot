const { z } = require('zod');
const { commonValidators } = require('./index');
const { RECORD_TYPES } = require('../models/MedicalRecord');
const { DIAGNOSIS_STATUSES } = require('../models/DiagnosisRecord');
const { LAB_INTERPRETATIONS } = require('../models/LabResultRecord');
const { DOCUMENT_TYPES } = require('../models/DocumentRecord');

// Content schemas for each discriminator
const visitContentSchema = z
  .object({
    symptoms: z.array(z.string().trim()).optional().default([]),
    diagnosis: z.string().trim().optional().default(''),
    notes: z.string().trim().optional().default(''),
    vitalSigns: z
      .object({
        bloodPressure: z.string().trim().optional().default(''),
        heartRate: z.number().nullable().optional(),
        temperature: z.number().nullable().optional(),
        respiratoryRate: z.number().nullable().optional(),
        oxygenSaturation: z.number().nullable().optional(),
      })
      .optional()
      .default({}),
  })
  .strict();

const diagnosisContentSchema = z
  .object({
    diagnosis: z.string({ required_error: 'Diagnosis is required' }).trim().min(1, 'Diagnosis is required'),
    condition: z.string().trim().optional().default(''),
    icdCode: z.string().trim().optional().default(''),
    status: z.enum(DIAGNOSIS_STATUSES).optional().default('PROVISIONAL'),
    notes: z.string().trim().optional().default(''),
  })
  .strict();

const medicationContentSchema = z
  .object({
    medicineName: z.string({ required_error: 'Medicine name is required' }).trim().min(1, 'Medicine name is required'),
    dosage: z.string({ required_error: 'Dosage is required' }).trim().min(1, 'Dosage is required'),
    frequency: z.string({ required_error: 'Frequency is required' }).trim().min(1, 'Frequency is required'),
    duration: z.string({ required_error: 'Duration is required' }).trim().min(1, 'Duration is required'),
    instructions: z.string().trim().optional().default(''),
  })
  .strict();

const labResultContentSchema = z
  .object({
    testName: z.string({ required_error: 'Test name is required' }).trim().min(1, 'Test name is required'),
    value: z.string({ required_error: 'Value is required' }).trim().min(1, 'Value is required'),
    unit: z.string().trim().optional().default(''),
    referenceRange: z.string().trim().optional().default(''),
    interpretation: z.enum(LAB_INTERPRETATIONS).optional().default('NORMAL'),
    notes: z.string().trim().optional().default(''),
  })
  .strict();

const prescribedItemSchema = z
  .object({
    medicineName: z.string({ required_error: 'Medicine name is required' }).trim().min(1, 'Medicine name is required'),
    dosage: z.string({ required_error: 'Dosage is required' }).trim().min(1, 'Dosage is required'),
    frequency: z.string({ required_error: 'Frequency is required' }).trim().min(1, 'Frequency is required'),
    duration: z.string({ required_error: 'Duration is required' }).trim().min(1, 'Duration is required'),
    instructions: z.string().trim().optional().default(''),
  })
  .strict();

const prescriptionContentSchema = z
  .object({
    medications: z
      .array(prescribedItemSchema)
      .min(1, 'Prescription must contain at least one medication'),
    instructions: z.string().trim().optional().default(''),
  })
  .strict();

const documentContentSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES).optional().default('CLINICAL_NOTE'),
    fileName: z.string({ required_error: 'File name is required' }).trim().min(1, 'File name is required'),
    mimeType: z.string({ required_error: 'MIME type is required' }).trim().min(1, 'MIME type is required'),
    storageReference: z.string({ required_error: 'Storage reference is required' }).trim().min(1, 'Storage reference is required'),
    fileSize: z.number().nullable().optional(),
    notes: z.string().trim().optional().default(''),
  })
  .strict();

const contentSchemasByType = {
  VISIT: visitContentSchema,
  DIAGNOSIS: diagnosisContentSchema,
  MEDICATION: medicationContentSchema,
  LAB_RESULT: labResultContentSchema,
  PRESCRIPTION: prescriptionContentSchema,
  DOCUMENT: documentContentSchema,
};

const createRecordSchema = z
  .object({
    patientId: commonValidators.objectId,
    hospitalId: commonValidators.objectId,
    recordType: z.enum(RECORD_TYPES, {
      errorMap: () => ({ message: 'Invalid record type' }),
    }),
    recordDate: z.coerce.date().optional(),
    content: z.record(z.any()).refine((val) => val && typeof val === 'object', {
      message: 'Record content must be an object',
    }),
  })
  .strict()
  .superRefine((data, ctx) => {
    const validator = contentSchemasByType[data.recordType];
    if (validator) {
      const result = validator.safeParse(data.content);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ['content', ...issue.path],
          });
        });
      }
    }
  });

const updateRecordSchema = z
  .object({
    recordDate: z.coerce.date().optional(),
    content: z.record(z.any()).optional(),
    // Identity fields allowed at validation boundary to enable explicit immutability error reporting
    patient: z.any().optional(),
    patientId: z.any().optional(),
    hospital: z.any().optional(),
    hospitalId: z.any().optional(),
    doctor: z.any().optional(),
    doctorId: z.any().optional(),
    recordType: z.any().optional(),
  })
  .strict();

const recordIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const patientRecordsQuerySchema = z.object({
  recordType: z.enum([...RECORD_TYPES, 'ALL']).optional(),
  hospitalId: commonValidators.objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = {
  createRecordSchema,
  updateRecordSchema,
  recordIdParamSchema,
  patientRecordsQuerySchema,
  contentSchemasByType,
  visitContentSchema,
  diagnosisContentSchema,
  medicationContentSchema,
  labResultContentSchema,
  prescriptionContentSchema,
  documentContentSchema,
};
