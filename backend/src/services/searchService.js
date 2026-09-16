/**
 * Semantic Clinical Search Service
 * Coordinates policy checks, AI vector retrieval, authoritative MongoDB record hydration,
 * and privacy-safe audit logging.
 */
const { MedicalRecord } = require('../models/MedicalRecord');
const { verifySearchAuthorization } = require('../policies/searchPolicy');
const aiServiceClient = require('./aiServiceClient');
const auditService = require('./auditService');
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
 * Execute authorized semantic clinical search
 */
const searchClinicalRecords = async ({ user, searchParams, clientMeta = {} }) => {
  let authorizedScope;

  try {
    authorizedScope = await verifySearchAuthorization({ user, searchParams });
  } catch (authError) {
    // Record privacy-safe denial in audit log without PHI
    await auditService.recordDenied(
      'SEMANTIC_SEARCH_DENIED',
      'SEARCH',
      null,
      authError.code || 'SEARCH_UNAUTHORIZED',
      {
        actor: user?.id,
        actorRole: user?.role || 'ANONYMOUS',
        patient: searchParams.patientId || null,
        hospital: searchParams.hospitalId || null,
        metadata: {
          requestedLimit: searchParams.limit,
        },
      }
    );
    throw authError;
  }

  // Query AI vector service with strictly authorized scope
  let aiSearchResponse;
  try {
    aiSearchResponse = await aiServiceClient.search({
      query: searchParams.query,
      patientId: authorizedScope.patientId,
      hospitalId: authorizedScope.hospitalId,
      recordTypes: authorizedScope.recordTypes,
      fromDate: authorizedScope.fromDate,
      toDate: authorizedScope.toDate,
      limit: authorizedScope.limit,
    });
  } catch (searchError) {
    logger.error('[SearchService] Vector search failure', { error: searchError.message });
    throw searchError;
  }

  const aiResults = aiSearchResponse.results || [];
  if (aiResults.length === 0) {
    // Audit search execution (zero PHI)
    await auditService.recordSuccess('SEMANTIC_SEARCH_PERFORMED', 'SEARCH', null, {
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId || null,
      hospital: authorizedScope.hospitalId || null,
      metadata: {
        resultCount: 0,
        recordTypes: authorizedScope.recordTypes,
      },
    });

    return {
      query: searchParams.query,
      totalResults: 0,
      results: [],
    };
  }

  // Fetch authoritative records from MongoDB
  const recordIds = aiResults.map((r) => r.medicalRecordId);
  const dbRecords = await MedicalRecord.find({ _id: { $in: recordIds } }).populate(medicalRecordPopulation);

  // Map database records by ID for fast lookup
  const recordMap = new Map();
  for (const rec of dbRecords) {
    recordMap.set(rec._id.toString(), rec);
  }

  // Preserve similarity ranking and attach score
  const hydratedResults = [];
  for (const aiItem of aiResults) {
    const dbRecord = recordMap.get(aiItem.medicalRecordId);
    if (dbRecord) {
      const recordObj = typeof dbRecord.toJSON === 'function' ? dbRecord.toJSON() : dbRecord;
      hydratedResults.push({
        ...recordObj,
        score: aiItem.score,
        chunkId: aiItem.chunkId,
      });
    }
  }

  // Audit search execution (zero PHI: query and medical contents are strictly omitted)
  await auditService.recordSuccess('SEMANTIC_SEARCH_PERFORMED', 'SEARCH', null, {
    actor: user.id,
    actorRole: user.role,
    patient: authorizedScope.patientId || null,
    hospital: authorizedScope.hospitalId || null,
    metadata: {
      resultCount: hydratedResults.length,
      recordTypes: authorizedScope.recordTypes,
    },
  });

  return {
    query: searchParams.query,
    totalResults: hydratedResults.length,
    results: hydratedResults,
  };
};

module.exports = {
  searchClinicalRecords,
};
