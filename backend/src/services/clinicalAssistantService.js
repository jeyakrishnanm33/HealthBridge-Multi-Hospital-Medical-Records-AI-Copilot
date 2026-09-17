/**
 * Clinical AI Assistant Service
 * Orchestrates authorization policies, vector retrieval, authoritative MongoDB hydration,
 * grounding validation, AI service dispatch, and zero-PHI audit logging.
 */
const { MedicalRecord } = require('../models/MedicalRecord');
const { verifyAssistantAuthorization } = require('../policies/clinicalAssistantPolicy');
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
 * Process a clinical question through the grounded RAG assistant pipeline
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

  // 2. Determine effective record type filters based on consent scopes if applicable
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

  // 3. Vector Search Retrieval via AI Service
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

  // If no vector matches found, return insufficient evidence response without LLM call
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

  // 4. Authoritative MongoDB Hydration & Verification
  const recordIds = aiResults.map((r) => r.medicalRecordId);
  const dbRecords = await MedicalRecord.find({ _id: { $in: recordIds } }).populate(
    medicalRecordPopulation
  );

  const recordMap = new Map();
  for (const rec of dbRecords) {
    recordMap.set(rec._id.toString(), rec);
  }

  // 5. Filter hydrated records against similarity threshold and consent scopes
  const minSimilarity = env.AI_RAG_MIN_SIMILARITY;
  const evidenceItems = [];

  for (const aiItem of aiResults) {
    const dbRecord = recordMap.get(aiItem.medicalRecordId);
    if (!dbRecord) {
      // Stale or deleted vector match - discard
      continue;
    }

    // If cross-hospital consent scope restricts types, ensure record satisfies allowed types
    if (
      authorizedScope.allowedRecordTypes &&
      !authorizedScope.allowedRecordTypes.includes(dbRecord.recordType)
    ) {
      continue;
    }

    // Similarity threshold check
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

  // If no records meet similarity or hydration criteria
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

  // 6. Dispatch Grounded Context to AI Microservice
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

  // 7. Privacy-Safe Audit Logging (Zero PHI: question, answer, and clinical text strictly omitted)
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
