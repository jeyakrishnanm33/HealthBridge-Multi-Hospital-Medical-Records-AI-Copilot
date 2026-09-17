/**
 * Declarative Tool Definitions and Metadata
 */
const {
  getRecentVisits,
  getDiagnoses,
  getMedications,
  getLabResults,
  getPrescriptions,
  getClinicalTimeline,
} = require('./clinicalTools');

const CLINICAL_TOOLS = {
  get_recent_visits: {
    name: 'get_recent_visits',
    description: 'Retrieve recent clinical visit encounters for an authorized patient.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of visit records to return (1-50, default 5).',
          default: 5,
        },
      },
      required: ['patientId'],
    },
    requiredScope: 'VISITS',
    handler: getRecentVisits,
  },

  get_diagnoses: {
    name: 'get_diagnoses',
    description: 'Retrieve clinical diagnoses for an authorized patient, optionally filtered by status.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        status: {
          type: 'string',
          enum: ['PROVISIONAL', 'CONFIRMED', 'RESOLVED'],
          description: 'Optional filter by diagnosis clinical status.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of diagnoses to return (1-50, default 10).',
          default: 10,
        },
      },
      required: ['patientId'],
    },
    requiredScope: 'DIAGNOSES',
    handler: getDiagnoses,
  },

  get_medications: {
    name: 'get_medications',
    description: 'Retrieve medication records for an authorized patient, optionally filtered by status.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'COMPLETED', 'DISCONTINUED'],
          description: 'Optional filter by medication status.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of medication records to return (1-50, default 10).',
          default: 10,
        },
      },
      required: ['patientId'],
    },
    requiredScope: 'MEDICATIONS',
    handler: getMedications,
  },

  get_lab_results: {
    name: 'get_lab_results',
    description: 'Retrieve laboratory test results for an authorized patient, optionally filtered by test name or interpretation.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        testName: {
          type: 'string',
          description: 'Optional case-insensitive substring filter on test name.',
        },
        interpretation: {
          type: 'string',
          enum: ['NORMAL', 'ABNORMAL', 'CRITICAL'],
          description: 'Optional filter by lab result interpretation.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of lab results to return (1-50, default 10).',
          default: 10,
        },
      },
      required: ['patientId'],
    },
    requiredScope: 'LAB_RESULTS',
    handler: getLabResults,
  },

  get_prescriptions: {
    name: 'get_prescriptions',
    description: 'Retrieve prescription records for an authorized patient, optionally filtered by status.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED'],
          description: 'Optional filter by prescription status.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of prescription records to return (1-50, default 10).',
          default: 10,
        },
      },
      required: ['patientId'],
    },
    requiredScope: 'PRESCRIPTIONS',
    handler: getPrescriptions,
  },

  get_clinical_timeline: {
    name: 'get_clinical_timeline',
    description: 'Retrieve a chronological clinical timeline of medical records for an authorized patient across record types.',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the target patient.',
        },
        startDate: {
          type: 'string',
          description: 'Optional ISO date string for start of timeline interval.',
        },
        endDate: {
          type: 'string',
          description: 'Optional ISO date string for end of timeline interval.',
        },
        recordTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['VISIT', 'DIAGNOSIS', 'MEDICATION', 'LAB_RESULT', 'PRESCRIPTION', 'DOCUMENT'],
          },
          description: 'Optional subset of record types to retrieve.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of records to return (1-50, default 20).',
          default: 20,
        },
      },
      required: ['patientId'],
    },
    requiredScope: null,
    handler: getClinicalTimeline,
  },
};

/**
 * Get schema definitions list for AI microservice tool selection request
 */
const getToolDefinitions = () => {
  return Object.values(CLINICAL_TOOLS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
};

module.exports = {
  CLINICAL_TOOLS,
  getToolDefinitions,
};
