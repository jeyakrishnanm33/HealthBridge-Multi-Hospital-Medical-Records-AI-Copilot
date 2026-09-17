/**
 * Clinical AI Assistant Service
 * Orchestrates authorization policies, controlled tool execution, vector retrieval,
 * authoritative MongoDB hydration, grounding validation, AI service dispatch, and zero-PHI audit logging.
 */
const { MedicalRecord } = require('../models/MedicalRecord');
const { verifyAssistantAuthorization } = require('../policies/clinicalAssistantPolicy');
const { getToolDefinitions } = require('../ai/tools/toolDefinitions');
const { executeToolCalls } = require('../ai/tools/toolExecutor');
const aiServiceClient = require('./aiServiceClient');
const auditService = require('./auditService');
const env = require('../config/env');
const logger = require('../utils/logger');

const medicalRecordPopulation = [
  {
    path: 'doctor',
    select: 'fullName specialization medicalLicenseNumber yearsOfExperience status user',
    populate: { path: 'user', select: 'name email role' },
  },
  {
    path: 'patient',
    select: 'patientId gender dateOfBirth bloodGroup status user',
    populate: { path: 'user', select: 'name email' },
  },
  {
    path: 'hospital',
    select: 'name hospitalCode status address contactEmail contactPhone',
  },
];

/**
 * Extract clean clinical payload from Mongoose polymorphic record
 */
const extractClinicalContent = (record) => {
  const raw = typeof record.toObject === 'function' ? record.toObject() : record;
  const {
    _id,
    id,
    patient,
    hospital,
    doctor,
    recordType,
    recordDate,
    createdAt,
    updatedAt,
    __v,
    ...clinicalData
  } = raw;

  return clinicalData;
};

/**
 * Process a clinical question through the grounded RAG assistant pipeline with controlled tool calling
 */
const askClinicalAssistant = async ({ user, queryParams, clientMeta = {} }) => {
  let authorizedScope;

  // 1. Authoritative Express Policy Verification
  try {
    authorizedScope = await verifyAssistantAuthorization({ user, queryParams });
  } catch (authError) {
    // Record zero-PHI denial in audit log
    await auditService.recordDenied(
      'CLINICAL_ASSISTANT_DENIED',
      'CLINICAL_ASSISTANT',
      null,
      authError.code || 'ASSISTANT_UNAUTHORIZED',
      {
        actor: user?.id,
        actorRole: user?.role || 'ANONYMOUS',
        patient: queryParams.patientId || null,
        hospital: queryParams.hospitalId || null,
        metadata: {
          requestedTopK: queryParams.topK,
        },
      }
    );
    throw authError;
  }

  // 2. Stage 1: AI Tool Selection or Direct Answer
  let toolSelectionResponse = null;
  try {
    const toolDefs = getToolDefinitions();
    toolSelectionResponse = await aiServiceClient.selectToolsOrAnswer({
      question: queryParams.question,
      patientId: authorizedScope.patientId,
      allowedTools: toolDefs,
    });
  } catch (selectErr) {
    logger.warn('[ClinicalAssistantService] Tool selection endpoint failed or unavailable, falling back to vector retrieval', {
      error: selectErr.message,
    });
  }

  // 3. Handle Direct Answer (Greetings, injection refusal, general non-clinical clarification)
  if (toolSelectionResponse && toolSelectionResponse.directAnswer) {
    await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId || null,
      hospital: authorizedScope.hospitalId || null,
      metadata: {
        retrievedCount: 0,
        grounded: false,
        directAnswer: true,
      },
    });

    return {
      answer: toolSelectionResponse.directAnswer,
      grounded: false,
      sources: [],
      metadata: {
        retrievedCount: 0,
        provider: 'assistant',
        model: 'direct-response',
      },
    };
  }

  // 4. Handle Tool Calling Execution
  if (
    toolSelectionResponse &&
    Array.isArray(toolSelectionResponse.toolCalls) &&
    toolSelectionResponse.toolCalls.length > 0
  ) {
    const toolResults = await executeToolCalls({
      toolCalls: toolSelectionResponse.toolCalls,
      user,
      patientId: authorizedScope.patientId,
      clientMeta,
    });

    const evidenceItems = [];
    const seenRecordIds = new Set();

    for (const tr of toolResults) {
      if (tr.success && Array.isArray(tr.data)) {
        for (const rec of tr.data) {
          const recId = rec.id || rec._id?.toString();
          if (recId && !seenRecordIds.has(recId)) {
            seenRecordIds.add(recId);
            evidenceItems.push({
              recordId: recId,
              recordType: rec.recordType,
              recordDate: rec.recordDate
                ? (rec.recordDate instanceof Date ? rec.recordDate.toISOString() : String(rec.recordDate))
                : null,
              hospitalName: rec.hospital?.name || 'HealthBridge Facility',
              doctorName: rec.doctor?.fullName || null,
              clinicalContent: extractClinicalContent(rec),
              score: 1.0,
            });
          }
        }
      }
    }

    if (evidenceItems.length === 0) {
      await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
        actor: user.id,
        actorRole: user.role,
        patient: authorizedScope.patientId || null,
        hospital: authorizedScope.hospitalId || null,
        metadata: {
          retrievedCount: 0,
          grounded: false,
          toolsUsed: toolResults.map((t) => t.toolName),
        },
      });

      return {
        answer:
          'Based on your available HealthBridge records, there is insufficient clinical documentation to answer this question. No matching authorized records were found.',
        grounded: false,
        sources: [],
        metadata: {
          retrievedCount: 0,
          provider: 'assistant',
          model: 'grounded-filter',
          toolsUsed: toolResults.map((t) => t.toolName),
        },
      };
    }

    // Dispatch Grounded Evidence to AI Microservice
    let ragResponse;
    try {
      ragResponse = await aiServiceClient.generateGroundedAnswer({
        question: queryParams.question,
        patientId: authorizedScope.patientId,
        evidence: evidenceItems,
      });
    } catch (ragError) {
      logger.error('[ClinicalAssistantService] Tool-grounded RAG generation failure', { error: ragError.message });
      await auditService.recordFailure(
        'CLINICAL_ASSISTANT_FAILURE',
        'CLINICAL_ASSISTANT',
        null,
        'RAG_GENERATION_ERROR',
        {
          actor: user.id,
          actorRole: user.role,
          patient: authorizedScope.patientId || null,
          metadata: { error: ragError.message },
        }
      );
      throw ragError;
    }

    // Zero-PHI Audit Logging
    await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId || null,
      hospital: authorizedScope.hospitalId || null,
      metadata: {
        retrievedCount: evidenceItems.length,
        grounded: ragResponse.grounded,
        recordTypes: Array.from(new Set(evidenceItems.map((e) => e.recordType))),
        toolsUsed: toolResults.map((t) => t.toolName),
      },
    });

    return {
      answer: ragResponse.answer,
      grounded: ragResponse.grounded,
      sources: ragResponse.sources || [],
      metadata: {
        ...(ragResponse.metadata || {}),
        retrievedCount: evidenceItems.length,
        toolsUsed: toolResults.map((t) => t.toolName),
      },
    };
  }

  // 5. Fallback Path: Vector Search Retrieval
  let effectiveRecordTypes = authorizedScope.recordTypes;
  if (authorizedScope.allowedRecordTypes) {
    if (effectiveRecordTypes && effectiveRecordTypes.length > 0) {
      effectiveRecordTypes = effectiveRecordTypes.filter((rt) =>
        authorizedScope.allowedRecordTypes.includes(rt)
      );
    } else {
      effectiveRecordTypes = authorizedScope.allowedRecordTypes;
    }
  }

  let aiSearchResponse;
  try {
    aiSearchResponse = await aiServiceClient.search({
      query: queryParams.question,
      patientId: authorizedScope.patientId,
      hospitalId: authorizedScope.hospitalId,
      recordTypes: effectiveRecordTypes,
      fromDate: authorizedScope.startDate,
      toDate: authorizedScope.endDate,
      limit: authorizedScope.topK || 5,
    });
  } catch (searchError) {
    logger.error('[ClinicalAssistantService] Vector retrieval failed', { error: searchError.message });
    await auditService.recordFailure(
      'CLINICAL_ASSISTANT_FAILURE',
      'CLINICAL_ASSISTANT',
      null,
      'VECTOR_RETRIEVAL_ERROR',
      {
        actor: user.id,
        actorRole: user.role,
        patient: authorizedScope.patientId || null,
        metadata: { error: searchError.message },
      }
    );
    throw searchError;
  }

  const aiResults = aiSearchResponse.results || [];

  if (aiResults.length === 0) {
    await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId || null,
      hospital: authorizedScope.hospitalId || null,
      metadata: {
        retrievedCount: 0,
        grounded: false,
      },
    });

    return {
      answer:
        'Based on your available HealthBridge records, there is insufficient clinical documentation to answer this question. No matching authorized records were found.',
      grounded: false,
      sources: [],
      metadata: {
        retrievedCount: 0,
        provider: 'assistant',
        model: 'grounded-filter',
      },
    };
  }

  // 6. Authoritative MongoDB Hydration & Verification
  const recordIds = aiResults.map((r) => r.medicalRecordId);
  const dbRecords = await MedicalRecord.find({ _id: { $in: recordIds } }).populate(
    medicalRecordPopulation
  );

  const recordMap = new Map();
  for (const rec of dbRecords) {
    recordMap.set(rec._id.toString(), rec);
  }

  const minSimilarity = env.AI_RAG_MIN_SIMILARITY;
  const evidenceItems = [];

  for (const aiItem of aiResults) {
    const dbRecord = recordMap.get(aiItem.medicalRecordId);
    if (!dbRecord) {
      continue;
    }

    if (
      authorizedScope.allowedRecordTypes &&
      !authorizedScope.allowedRecordTypes.includes(dbRecord.recordType)
    ) {
      continue;
    }

    if (typeof aiItem.score === 'number' && aiItem.score < minSimilarity) {
      continue;
    }

    evidenceItems.push({
      recordId: dbRecord._id.toString(),
      recordType: dbRecord.recordType,
      recordDate: dbRecord.recordDate
        ? (dbRecord.recordDate instanceof Date ? dbRecord.recordDate.toISOString() : String(dbRecord.recordDate))
        : null,
      hospitalName: dbRecord.hospital?.name || 'HealthBridge Facility',
      doctorName: dbRecord.doctor?.fullName || null,
      clinicalContent: extractClinicalContent(dbRecord),
      score: aiItem.score,
    });
  }

  if (evidenceItems.length === 0) {
    await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId || null,
      hospital: authorizedScope.hospitalId || null,
      metadata: {
        retrievedCount: 0,
        grounded: false,
        reason: 'BELOW_SIMILARITY_THRESHOLD',
      },
    });

    return {
      answer:
        'Based on your available HealthBridge records, there is not enough relevant documented clinical evidence to answer this question accurately.',
      grounded: false,
      sources: [],
      metadata: {
        retrievedCount: 0,
        provider: 'assistant',
        model: 'grounded-filter',
      },
    };
  }

  // 7. Dispatch Grounded Context to AI Microservice
  let ragResponse;
  try {
    ragResponse = await aiServiceClient.generateGroundedAnswer({
      question: queryParams.question,
      patientId: authorizedScope.patientId,
      evidence: evidenceItems,
    });
  } catch (ragError) {
    logger.error('[ClinicalAssistantService] RAG generation failure', { error: ragError.message });
    await auditService.recordFailure(
      'CLINICAL_ASSISTANT_FAILURE',
      'CLINICAL_ASSISTANT',
      null,
      'RAG_GENERATION_ERROR',
      {
        actor: user.id,
        actorRole: user.role,
        patient: authorizedScope.patientId || null,
        metadata: { error: ragError.message },
      }
    );
    throw ragError;
  }

  // 8. Privacy-Safe Audit Logging
  await auditService.recordSuccess('CLINICAL_ASSISTANT_QUERY', 'CLINICAL_ASSISTANT', null, {
    actor: user.id,
    actorRole: user.role,
    patient: authorizedScope.patientId || null,
    hospital: authorizedScope.hospitalId || null,
    metadata: {
      retrievedCount: evidenceItems.length,
      grounded: ragResponse.grounded,
      recordTypes: Array.from(new Set(evidenceItems.map((e) => e.recordType))),
    },
  });

  return {
    answer: ragResponse.answer,
    grounded: ragResponse.grounded,
    sources: ragResponse.sources || [],
    metadata: ragResponse.metadata || {
      retrievedCount: evidenceItems.length,
    },
  };
};

module.exports = {
  askClinicalAssistant,
};

