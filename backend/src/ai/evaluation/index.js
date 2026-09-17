/**
 * HealthBridge AI Evaluation Suite Module
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
const { runEvaluationCase, runFullEvaluationSuite } = require('./evaluationRunner');

module.exports = {
  EVALUATION_CASES,
  EVALUATION_CATEGORIES,
  assertRetrieval,
  assertAuthorization,
  assertSecurityContextIsolation,
  assertGrounding,
  assertUnsupportedClaim,
  assertResponseStructure,
  assertToolSelection,
  assertAgentBehavior,
  assertPromptInjectionDefense,
  aggregateEvaluationMetrics,
  formatEvaluationReport,
  runEvaluationCase,
  runFullEvaluationSuite,
};
