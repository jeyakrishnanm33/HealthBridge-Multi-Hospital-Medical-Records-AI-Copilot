/**
 * AI Evaluation Suite Runner
 * Executes evaluation cases against HealthBridge authorization and AI services with zero PHI.
 */
const { EVALUATION_CASES, EVALUATION_CATEGORIES } = require('./evaluationCases');
const {
  assertRetrieval,
  assertAuthorization,
  assertSecurityContextIsolation,
  assertGrounding,
  assertUnsupportedClaim,
  assertResponseStructure,
  assertToolSelection,
  assertAgentBehavior,
  assertPromptInjectionDefense,
} = require('./evaluationAssertions');
const { aggregateEvaluationMetrics, formatEvaluationReport } = require('./evaluationMetrics');
const logger = require('../../utils/logger');

/**
 * Execute a single evaluation test case
 *
 * @param {Object} evalCase - The evaluation case definition
 * @param {Object} executionContext - Service helpers and context
 * @returns {Promise<Object>} Evaluated case result
 */
const runEvaluationCase = async (evalCase, executionContext = {}) => {
  const startTime = Date.now();
  let passed = false;
  let reason = '';
  let metrics = {};

  try {
    switch (evalCase.category) {
      case EVALUATION_CATEGORIES.RETRIEVAL: {
        const retrieved = await executionContext.retrievalFn(evalCase);
        const assertion = assertRetrieval({ expectedCase: evalCase, retrievedRecords: retrieved });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.AUTHORIZATION: {
        const authResult = await executionContext.authFn(evalCase);
        const assertion = assertAuthorization({
          expectedCase: evalCase,
          actualStatus: authResult.status,
          actualErrorCode: authResult.errorCode,
        });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.CRITICAL_SECURITY: {
        const secResult = await executionContext.securityIsolationFn(evalCase);
        const assertion = assertSecurityContextIsolation({
          unauthorizedRecordIds: secResult.unauthorizedRecordIds,
          llmReceivedContext: secResult.llmReceivedContext,
        });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.GROUNDING: {
        const resp = await executionContext.groundingFn(evalCase);
        const assertion = assertGrounding({ expectedCase: evalCase, response: resp });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.UNSUPPORTED_CLAIMS: {
        const resp = await executionContext.unsupportedClaimsFn(evalCase);
        const assertion = assertUnsupportedClaim({ expectedCase: evalCase, response: resp });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.RESPONSE_STRUCTURE: {
        const resp = await executionContext.responseStructureFn(evalCase);
        const assertion = assertResponseStructure({ expectedCase: evalCase, response: resp });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.TOOL_SELECTION: {
        const selected = await executionContext.toolSelectionFn(evalCase);
        const assertion = assertToolSelection({ expectedCase: evalCase, selectedTools: selected });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.AGENT_BEHAVIOR: {
        const agentResult = await executionContext.agentBehaviorFn(evalCase);
        const assertion = assertAgentBehavior({ expectedCase: evalCase, agentResult });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      case EVALUATION_CATEGORIES.PROMPT_INJECTION: {
        const resp = await executionContext.promptInjectionFn(evalCase);
        const assertion = assertPromptInjectionDefense({ response: resp, expectedCase: evalCase });
        passed = assertion.passed;
        reason = assertion.reason;
        metrics = assertion.metrics;
        break;
      }

      default: {
        passed = false;
        reason = `Unknown evaluation category: ${evalCase.category}`;
      }
    }
  } catch (err) {
    passed = false;
    reason = `Execution exception: ${err.message}`;
  }

  const durationMs = Date.now() - startTime;
  return {
    caseId: evalCase.id,
    category: evalCase.category,
    passed,
    reason,
    metrics,
    durationMs,
  };
};

/**
 * Run full evaluation suite
 *
 * @param {Object} executionContext - Handlers for evaluation categories
 * @returns {Promise<Object>} Aggregated metrics and case details
 */
const runFullEvaluationSuite = async (executionContext = {}) => {
  const caseResults = [];

  for (const evalCase of EVALUATION_CASES) {
    const result = await runEvaluationCase(evalCase, executionContext);
    caseResults.push(result);
  }

  const aggregated = aggregateEvaluationMetrics(caseResults);
  const report = formatEvaluationReport(aggregated);

  return {
    metrics: aggregated,
    report,
    caseResults,
  };
};

module.exports = {
  runEvaluationCase,
  runFullEvaluationSuite,
};
