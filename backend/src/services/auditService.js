const { AuditLog, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, AUDIT_RESULTS } = require('../models/AuditLog');
const { getContext } = require('../utils/requestContext');
const logger = require('../utils/logger');

// Sensitive keys that must NEVER be persisted in audit metadata
const SENSITIVE_KEY_PATTERNS = [
  /^password/i,
  /^passwordhash/i,
  /^token/i,
  /^refreshtoken/i,
  /^authorization/i,
  /^secret/i,
  /^credential/i,
  /^symptoms$/i,
  /^vitalsigns$/i,
  /^diagnosis$/i,
  /^notes$/i,
  /^storagereference$/i,
  /^medicalrecordcontent$/i,
];

/**
 * Deeply sanitizes metadata to prevent accidental leaks of sensitive credentials,
 * authentication tokens, or protected clinical details.
 *
 * @param {Object} data
 * @param {number} depth
 * @returns {Object}
 */
function sanitizeMetadata(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 5) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 50).map((item) => sanitizeMetadata(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeMetadata(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Normalizes an actor parameter into an ID and role.
 *
 * @param {Object|string|null} actor
 * @param {string|null} fallbackRole
 * @returns {{ actorId: string|null, actorRole: string }}
 */
function resolveActor(actor, fallbackRole) {
  if (!actor) {
    return { actorId: null, actorRole: fallbackRole || 'ANONYMOUS' };
  }

  if (typeof actor === 'object') {
    const actorId = actor._id ? actor._id.toString() : actor.id || null;
    const actorRole = actor.role || fallbackRole || 'ANONYMOUS';
    return { actorId, actorRole };
  }

  return { actorId: actor.toString(), actorRole: fallbackRole || 'ANONYMOUS' };
}

/**
 * Normalizes ObjectId/string references for patient/hospital/resource.
 */
function resolveId(entity) {
  if (!entity) return null;
  if (typeof entity === 'object') {
    return entity._id ? entity._id.toString() : entity.id || null;
  }
  return entity.toString();
}

/**
 * Records an immutable audit event to the audit_logs collection.
 * Automatically enriches the event from the ambient request context if available.
 *
 * @param {Object} eventData
 * @returns {Promise<Object>} Created AuditLog document
 */
async function recordEvent({
  action,
  resourceType,
  resourceId = null,
  actor = null,
  actorRole = null,
  patient = null,
  hospital = null,
  result = 'SUCCESS',
  reasonCode = null,
  metadata = {},
  requestId = null,
  ipAddress = null,
  userAgent = null,
  isCritical = false,
}) {
  try {
    const context = getContext();

    // Resolve actor details (explicit takes precedence, fallback to context)
    const activeActor = actor || context.actor || null;
    const { actorId, actorRole: resolvedRole } = resolveActor(activeActor, actorRole);

    // Resolve correlation and client context
    const resolvedRequestId = requestId || context.requestId || null;
    const resolvedIp = ipAddress || context.ipAddress || null;
    const resolvedUserAgent = userAgent || context.userAgent || null;

    // Resolve references
    const patientId = resolveId(patient);
    const hospitalId = resolveId(hospital);
    const resolvedResourceId = resolveId(resourceId);

    // Sanitize metadata
    const safeMetadata = sanitizeMetadata(metadata);

    const logEntry = await AuditLog.create({
      actor: actorId,
      actorRole: resolvedRole,
      action,
      resourceType,
      resourceId: resolvedResourceId,
      patient: patientId,
      hospital: hospitalId,
      result,
      reasonCode,
      metadata: safeMetadata,
      requestId: resolvedRequestId,
      ipAddress: resolvedIp,
      userAgent: resolvedUserAgent,
    });

    return logEntry;
  } catch (error) {
    logger.error(`[AUDIT] Failed to persist audit log for action: ${action}`, error);

    // If critical, rethrow so callers know security recording failed
    if (isCritical) {
      throw error;
    }
    return null;
  }
}

/**
 * Convenience helper for successful actions.
 */
async function recordSuccess(action, resourceType, resourceId, options = {}) {
  return recordEvent({
    action,
    resourceType,
    resourceId,
    result: 'SUCCESS',
    ...options,
  });
}

/**
 * Convenience helper for denied actions (authorization, policies, restrictions).
 */
async function recordDenied(action, resourceType, resourceId, reasonCode, options = {}) {
  return recordEvent({
    action,
    resourceType,
    resourceId,
    result: 'DENIED',
    reasonCode,
    isCritical: true, // Denials are security-relevant
    ...options,
  });
}

/**
 * Convenience helper for failed operations (bad input, processing errors).
 */
async function recordFailure(action, resourceType, resourceId, reasonCode, options = {}) {
  return recordEvent({
    action,
    resourceType,
    resourceId,
    result: 'FAILURE',
    reasonCode,
    ...options,
  });
}

module.exports = {
  recordEvent,
  recordSuccess,
  recordDenied,
  recordFailure,
  sanitizeMetadata,
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESULTS,
};
