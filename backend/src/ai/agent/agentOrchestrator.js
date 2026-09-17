/**
 * Clinical Agent Orchestrator
 * Governs bounded multi-step clinical reasoning, tool execution, citation verification, and zero-PHI auditing.
 */
const { AgentStateMachine, AGENT_STATES } = require('./agentState');
const { agentStepDecisionSchema } = require('./agentValidators');
const { getToolDefinitions, CLINICAL_TOOLS } = require('../tools/toolDefinitions');
const { executeToolCall } = require('../tools/toolExecutor');
const aiServiceClient = require('../../services/aiServiceClient');
const auditService = require('../../services/auditService');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { AppError } = require('../../errors/AppError');

/**
 * Extract clean clinical payload from plain record or Mongoose object
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
 * Run a bounded, authorized multi-step clinical agent workflow
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated user context
 * @param {Object} params.authorizedScope - Verified authorization scope from clinicalAssistantPolicy
 * @param {string} params.question - Clinical query
 * @param {Object} [params.clientMeta] - IP and User-Agent
 * @returns {Promise<Object>} Grounded clinical response with verified citations
 */
const runAgentWorkflow = async ({ user, authorizedScope, question, clientMeta = {} }) => {
  const startTime = Date.now();
  const stateMachine = new AgentStateMachine(AGENT_STATES.INITIALIZING);

  const maxSteps = env.AI_AGENT_MAX_STEPS || 4;
  const maxToolCalls = env.AI_AGENT_MAX_TOOL_CALLS || 4;
  const maxContextItems = env.AI_AGENT_MAX_CONTEXT_ITEMS || 100;
  const timeoutMs = env.AI_AGENT_TIMEOUT_MS || 15000;

  // 1. Audit Agent Workflow Started (Zero PHI)
  await auditService.recordEvent({
    action: 'CLINICAL_AGENT_STARTED',
    resourceType: 'CLINICAL_AGENT',
    resourceId: null,
    actor: user.id,
    actorRole: user.role,
    patient: authorizedScope.patientId,
    hospital: authorizedScope.hospitalId || null,
    result: 'SUCCESS',
    metadata: {
      maxSteps,
      maxToolCalls,
      timeoutMs,
    },
    ipAddress: clientMeta.ipAddress || null,
    userAgent: clientMeta.userAgent || null,
  });

  let stepNumber = 1;
  let toolCallCount = 0;
  const retrievedEvidence = [];
  const actuallyRetrievedRecordIds = new Set();
  const previousSteps = [];
  const toolsUsed = [];

  try {
    while (stepNumber <= maxSteps && !stateMachine.isTerminal()) {
      // Check hard server timeout
      if (Date.now() - startTime > timeoutMs) {
        logger.warn('[AgentOrchestrator] Agent execution timed out', { stepNumber, durationMs: Date.now() - startTime });
        break;
      }

      stateMachine.transitionTo(AGENT_STATES.PLANNING, { stepNumber });

      // Call AI planner for next step decision
      let planResponse;
      try {
        const toolDefs = getToolDefinitions();
        planResponse = await aiServiceClient.planAgentStep({
          question,
          patientId: authorizedScope.patientId,
          stepNumber,
          retrievedEvidence,
          previousSteps,
          allowedTools: toolDefs,
        });
      } catch (plannerErr) {
        logger.error('[AgentOrchestrator] AI Planner step failed', { error: plannerErr.message });
        throw plannerErr;
      }

      const parsedDecision = agentStepDecisionSchema.safeParse(planResponse.decision);
      if (!parsedDecision.success) {
        logger.warn('[AgentOrchestrator] Malformed planner decision', { errors: parsedDecision.error.issues });
        break;
      }
      const decision = parsedDecision.data;

      // Handle FINAL Answer
      if (decision.action === 'FINAL') {
        if (decision.answer) {
          stateMachine.transitionTo(AGENT_STATES.FINALIZING);

          // Citation Verification Gate: ensure every citation references an actually retrieved record
          const verifiedSources = (decision.citations || []).filter((c) =>
            c.recordId && actuallyRetrievedRecordIds.has(String(c.recordId))
          );

          stateMachine.transitionTo(AGENT_STATES.COMPLETED);

          const durationMs = Date.now() - startTime;
          await auditService.recordEvent({
            action: 'CLINICAL_AGENT_COMPLETED',
            resourceType: 'CLINICAL_AGENT',
            resourceId: null,
            actor: user.id,
            actorRole: user.role,
            patient: authorizedScope.patientId,
            hospital: authorizedScope.hospitalId || null,
            result: 'SUCCESS',
            metadata: {
              steps: stepNumber,
              toolsUsed,
              retrievedCount: retrievedEvidence.length,
              citationsCount: verifiedSources.length,
              durationMs,
            },
            ipAddress: clientMeta.ipAddress || null,
            userAgent: clientMeta.userAgent || null,
          });

          return {
            answer: decision.answer,
            grounded: verifiedSources.length > 0 || retrievedEvidence.length > 0,
            sources: verifiedSources,
            metadata: {
              provider: 'agent',
              steps: stepNumber,
              toolsUsed,
              thoughtSummary: decision.thoughtSummary || null,
            },
          };
        }
        // If final action has no text, exit loop to force final grounded synthesis below
        break;
      }

      // Handle TOOL_CALL
      if (decision.action === 'TOOL_CALL') {
        if (toolCallCount >= maxToolCalls) {
          logger.info('[AgentOrchestrator] Reached maximum allowed tool calls', { toolCallCount });
          stateMachine.transitionTo(AGENT_STATES.LIMIT_REACHED);
          await auditService.recordEvent({
            action: 'CLINICAL_AGENT_LIMIT_REACHED',
            resourceType: 'CLINICAL_AGENT',
            resourceId: null,
            actor: user.id,
            actorRole: user.role,
            patient: authorizedScope.patientId,
            hospital: authorizedScope.hospitalId || null,
            result: 'SUCCESS',
            metadata: { reason: 'MAX_TOOL_CALLS_REACHED', toolCallCount },
            ipAddress: clientMeta.ipAddress || null,
            userAgent: clientMeta.userAgent || null,
          });
          break;
        }

        const toolName = decision.tool;
        if (!toolName || !CLINICAL_TOOLS[toolName]) {
          logger.warn('[AgentOrchestrator] Unknown tool requested by agent planner', { toolName });
          previousSteps.push({
            stepNumber,
            tool: toolName || 'unknown',
            resultCount: 0,
            status: 'UNKNOWN_TOOL',
          });
          stepNumber++;
          continue;
        }

        stateMachine.transitionTo(AGENT_STATES.WAITING_FOR_TOOL, { tool: toolName });
        stateMachine.transitionTo(AGENT_STATES.EXECUTING_TOOL, { tool: toolName });

        await auditService.recordEvent({
          action: 'CLINICAL_AGENT_STEP',
          resourceType: 'CLINICAL_AGENT',
          resourceId: null,
          actor: user.id,
          actorRole: user.role,
          patient: authorizedScope.patientId,
          hospital: authorizedScope.hospitalId || null,
          result: 'SUCCESS',
          metadata: {
            stepNumber,
            toolName,
          },
          ipAddress: clientMeta.ipAddress || null,
          userAgent: clientMeta.userAgent || null,
        });

        // Execute tool securely via Phase 14 Tool Executor (authoritative authorization & validation)
        let toolResult;
        try {
          toolResult = await executeToolCall({
            toolCall: {
              name: toolName,
              arguments: decision.arguments || { patientId: authorizedScope.patientId },
            },
            user,
            patientId: authorizedScope.patientId,
            clientMeta,
          });
        } catch (execErr) {
          logger.warn(`[AgentOrchestrator] Tool execution error for '${toolName}'`, { error: execErr.message });
          // If auth error, deny agent workflow
          if (execErr.code && (execErr.code.includes('DENIED') || execErr.code.includes('RESTRICTED') || execErr.code.includes('FORBIDDEN'))) {
            stateMachine.transitionTo(AGENT_STATES.FAILED);
            await auditService.recordDenied(
              'CLINICAL_AGENT_DENIED',
              'CLINICAL_AGENT',
              null,
              execErr.code,
              {
                actor: user.id,
                actorRole: user.role,
                patient: authorizedScope.patientId,
                metadata: { toolName, error: execErr.message },
              }
            );
            throw execErr;
          }

          previousSteps.push({
            stepNumber,
            tool: toolName,
            resultCount: 0,
            status: 'ERROR',
          });
          stepNumber++;
          continue;
        }

        stateMachine.transitionTo(AGENT_STATES.EVALUATING_RESULT, { tool: toolName });
        toolsUsed.push(toolName);
        toolCallCount++;

        const items = toolResult.data || [];
        for (const item of items) {
          const recId = item.id || item._id?.toString();
          if (recId && !actuallyRetrievedRecordIds.has(recId)) {
            actuallyRetrievedRecordIds.add(recId);
            if (retrievedEvidence.length < maxContextItems) {
              retrievedEvidence.push({
                recordId: recId,
                recordType: item.recordType,
                recordDate: item.recordDate
                  ? (item.recordDate instanceof Date ? item.recordDate.toISOString() : String(item.recordDate))
                  : null,
                hospitalName: item.hospital?.name || 'HealthBridge Facility',
                doctorName: item.doctor?.fullName || null,
                clinicalContent: extractClinicalContent(item),
                score: 1.0,
              });
            }
          }
        }

        previousSteps.push({
          stepNumber,
          tool: toolName,
          resultCount: items.length,
          status: 'SUCCESS',
        });

        stepNumber++;
      }
    }

    // Force Final Synthesis
    stateMachine.transitionTo(AGENT_STATES.FINALIZING);

    if (retrievedEvidence.length === 0) {
      stateMachine.transitionTo(AGENT_STATES.COMPLETED);
      const durationMs = Date.now() - startTime;

      await auditService.recordEvent({
        action: 'CLINICAL_AGENT_COMPLETED',
        resourceType: 'CLINICAL_AGENT',
        resourceId: null,
        actor: user.id,
        actorRole: user.role,
        patient: authorizedScope.patientId,
        hospital: authorizedScope.hospitalId || null,
        result: 'SUCCESS',
        metadata: {
          steps: stepNumber,
          toolsUsed,
          retrievedCount: 0,
          citationsCount: 0,
          durationMs,
        },
        ipAddress: clientMeta.ipAddress || null,
        userAgent: clientMeta.userAgent || null,
      });

      return {
        answer:
          'Based on your available HealthBridge records, there is insufficient clinical documentation to answer this question. No matching authorized records were found.',
        grounded: false,
        sources: [],
        metadata: {
          provider: 'agent',
          steps: stepNumber,
          toolsUsed,
        },
      };
    }

    const ragResponse = await aiServiceClient.generateGroundedAnswer({
      question,
      patientId: authorizedScope.patientId,
      evidence: retrievedEvidence,
    });

    const verifiedSources = (ragResponse.sources || []).filter((s) =>
      s.recordId && actuallyRetrievedRecordIds.has(String(s.recordId))
    );

    stateMachine.transitionTo(AGENT_STATES.COMPLETED);
    const durationMs = Date.now() - startTime;

    await auditService.recordEvent({
      action: 'CLINICAL_AGENT_COMPLETED',
      resourceType: 'CLINICAL_AGENT',
      resourceId: null,
      actor: user.id,
      actorRole: user.role,
      patient: authorizedScope.patientId,
      hospital: authorizedScope.hospitalId || null,
      result: 'SUCCESS',
      metadata: {
        steps: stepNumber,
        toolsUsed,
        retrievedCount: retrievedEvidence.length,
        citationsCount: verifiedSources.length,
        durationMs,
      },
      ipAddress: clientMeta.ipAddress || null,
      userAgent: clientMeta.userAgent || null,
    });

    return {
      answer: ragResponse.answer,
      grounded: ragResponse.grounded,
      sources: verifiedSources,
      metadata: {
        provider: 'agent',
        steps: stepNumber,
        toolsUsed,
        retrievedCount: retrievedEvidence.length,
      },
    };
  } catch (error) {
    if (!stateMachine.isTerminal()) {
      try {
        stateMachine.transitionTo(AGENT_STATES.FAILED);
      } catch (_) {}
    }

    await auditService.recordFailure(
      'CLINICAL_AGENT_FAILURE',
      'CLINICAL_AGENT',
      null,
      error.code || 'AGENT_EXECUTION_ERROR',
      {
        actor: user.id,
        actorRole: user.role,
        patient: authorizedScope.patientId,
        metadata: {
          error: error.message,
          stepNumber,
          toolsUsed,
        },
      }
    );

    throw error;
  }
};

module.exports = {
  runAgentWorkflow,
};
