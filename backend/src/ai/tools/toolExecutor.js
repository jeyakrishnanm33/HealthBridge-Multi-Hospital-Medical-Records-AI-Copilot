/**
 * Clinical Tool Execution Engine
 * Validates, authorizes, and executes clinical data tools with timeout safety and zero-PHI auditing.
 */
const { CLINICAL_TOOLS } = require('./toolDefinitions');
const { toolValidators } = require('./toolValidators');
const { authorizeClinicalToolAccess } = require('../../policies/clinicalToolPolicy');
const auditService = require('../../services/auditService');
const env = require('../../config/env');
const { BadRequestError, NotFoundError } = require('../../errors/AppError');
const logger = require('../../utils/logger');

/**
 * Execute a single clinical tool call securely
 *
 * @param {Object} params
 * @param {Object} params.toolCall - { name: string, arguments: Object }
 * @param {Object} params.user - Authenticated user { id, role }
 * @param {string} params.patientId - Context patient ID
 * @param {Object} [params.clientMeta] - Request context (ip, userAgent)
 * @returns {Promise<Object>} Execution result { toolName, success, count, data, error }
 */
const executeToolCall = async ({ toolCall, user, patientId, clientMeta = {} }) => {
  const startTime = Date.now();
  const toolName = toolCall?.name;

  // 1. Tool Lookup
  const toolDef = CLINICAL_TOOLS[toolName];
  if (!toolDef) {
    logger.warn('[ToolExecutor] Unknown tool requested', { toolName });
    throw new NotFoundError(`Clinical tool '${toolName}' is not recognized`, 'TOOL_NOT_FOUND');
  }

  // 2. Prepare & Validate Arguments
  const rawArgs = { ...(toolCall.arguments || {}) };
  // Ensure patientId is bound to the authorized context patientId
  if (!rawArgs.patientId) {
    rawArgs.patientId = patientId;
  } else if (patientId && rawArgs.patientId.toString() !== patientId.toString()) {
    throw new BadRequestError('Tool argument patientId does not match request patient context', 'PATIENT_MISMATCH');
  }

  const validator = toolValidators[toolName];
  if (!validator) {
    throw new BadRequestError(`No validation schema found for tool '${toolName}'`, 'TOOL_SCHEMA_MISSING');
  }

  const parseResult = validator.safeParse(rawArgs);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new BadRequestError(`Invalid arguments for tool '${toolName}': ${errorDetails}`, 'INVALID_TOOL_ARGUMENTS');
  }
  const validatedArgs = parseResult.data;

  // 3. Pre-execution Authorization
  let authContext;
  try {
    authContext = await authorizeClinicalToolAccess({
      user,
      patientId: validatedArgs.patientId,
      requiredScope: toolDef.requiredScope,
    });
  } catch (authErr) {
    // Record zero-PHI denial
    await auditService.recordDenied(
      'CLINICAL_TOOL_DENIED',
      'CLINICAL_TOOL',
      null,
      authErr.code || 'TOOL_ACCESS_DENIED',
      {
        actor: user?.id,
        actorRole: user?.role || 'ANONYMOUS',
        patient: validatedArgs.patientId,
        metadata: {
          toolName,
          requiredScope: toolDef.requiredScope,
        },
      }
    );
    throw authErr;
  }

  // 4. Audit Tool Request (Zero-PHI: argument keys only, no raw text)
  await auditService.recordEvent({
    action: 'CLINICAL_TOOL_REQUESTED',
    resourceType: 'CLINICAL_TOOL',
    resourceId: null,
    actor: user.id,
    actorRole: user.role,
    patient: validatedArgs.patientId,
    hospital: null,
    result: 'SUCCESS',
    metadata: {
      toolName,
      argKeys: Object.keys(validatedArgs),
    },
    ipAddress: clientMeta.ipAddress || null,
    userAgent: clientMeta.userAgent || null,
  });

  // 5. Execute with Timeout
  const timeoutMs = env.AI_TOOL_EXECUTION_TIMEOUT_MS || 5000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const records = await Promise.race([
      toolDef.handler(validatedArgs, authContext),
      timeoutPromise,
    ]);

    const resultList = Array.isArray(records) ? records : [];
    const cappedList = resultList.slice(0, env.AI_TOOL_RESULT_MAX_ITEMS || 50);
    const executionDuration = Date.now() - startTime;

    // 6. Audit Successful Tool Execution (Zero-PHI: counts & duration only)
    await auditService.recordEvent({
      action: 'CLINICAL_TOOL_EXECUTED',
      resourceType: 'CLINICAL_TOOL',
      resourceId: null,
      actor: user.id,
      actorRole: user.role,
      patient: validatedArgs.patientId,
      hospital: null,
      result: 'SUCCESS',
      metadata: {
        toolName,
        resultCount: cappedList.length,
        executionDurationMs: executionDuration,
      },
      ipAddress: clientMeta.ipAddress || null,
      userAgent: clientMeta.userAgent || null,
    });

    return {
      toolName,
      success: true,
      count: cappedList.length,
      data: cappedList,
    };
  } catch (execErr) {
    const executionDuration = Date.now() - startTime;
    logger.error(`[ToolExecutor] Error executing tool '${toolName}'`, { error: execErr.message });

    await auditService.recordFailure(
      'CLINICAL_TOOL_FAILURE',
      'CLINICAL_TOOL',
      null,
      'TOOL_EXECUTION_ERROR',
      {
        actor: user.id,
        actorRole: user.role,
        patient: validatedArgs.patientId,
        metadata: {
          toolName,
          executionDurationMs: executionDuration,
          errorMessage: execErr.message,
        },
      }
    );

    throw execErr;
  }
};

/**
 * Execute multiple tool calls up to AI_TOOL_CALL_MAX safely
 *
 * @param {Object} params
 * @param {Array<Object>} params.toolCalls - List of tool calls
 * @param {Object} params.user - Authenticated user
 * @param {string} params.patientId - Context patient ID
 * @param {Object} [params.clientMeta] - Request metadata
 * @returns {Promise<Array<Object>>} Execution results
 */
const executeToolCalls = async ({ toolCalls = [], user, patientId, clientMeta = {} }) => {
  const maxCalls = env.AI_TOOL_CALL_MAX || 2;
  const boundedCalls = toolCalls.slice(0, maxCalls);

  const results = [];
  for (const call of boundedCalls) {
    const result = await executeToolCall({ toolCall: call, user, patientId, clientMeta });
    results.push(result);
  }

  return results;
};

module.exports = {
  executeToolCall,
  executeToolCalls,
};
