/**
 * Agent Step & Output Validators
 */
const { z } = require('zod');

const agentStepDecisionSchema = z.object({
  action: z.enum(['TOOL_CALL', 'FINAL']),
  tool: z.string().nullable().optional(),
  arguments: z.record(z.any()).default({}),
  answer: z.string().nullable().optional(),
  citations: z
    .array(
      z.object({
        recordId: z.string(),
        recordType: z.string().optional(),
        recordDate: z.string().nullable().optional(),
        hospitalName: z.string().optional(),
        doctorName: z.string().nullable().optional(),
      })
    )
    .default([]),
  thoughtSummary: z.string().nullable().optional(),
});

const agentCitationSchema = z.object({
  recordId: z.string(),
  recordType: z.string().optional(),
  recordDate: z.string().nullable().optional(),
  hospitalName: z.string().optional(),
  doctorName: z.string().nullable().optional(),
});

const agentFinalResultSchema = z.object({
  answer: z.string(),
  grounded: z.boolean(),
  sources: z.array(agentCitationSchema).default([]),
  metadata: z.record(z.any()).default({}),
});

module.exports = {
  agentStepDecisionSchema,
  agentCitationSchema,
  agentFinalResultSchema,
};
