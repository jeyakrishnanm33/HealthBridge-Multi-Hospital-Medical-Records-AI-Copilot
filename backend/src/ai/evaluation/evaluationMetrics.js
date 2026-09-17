/**
 * AI Evaluation Suite Metrics Aggregator
 * Computes precision, recall, hit rates, and pass rates with zero PHI reporting.
 */

/**
 * Aggregate evaluation results into structured summary metrics
 *
 * @param {Array<Object>} results - List of evaluated case results
 * @returns {Object} Comprehensive evaluation metrics
 */
const aggregateEvaluationMetrics = (results = []) => {
  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const failedCases = totalCases - passedCases;
  const passRate = totalCases > 0 ? parseFloat(((passedCases / totalCases) * 100).toFixed(1)) : 0;

  // Breakdown by category
  const categoryBreakdown = {};
  for (const res of results) {
    const cat = res.category || 'UNKNOWN';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
      };
    }
    categoryBreakdown[cat].total++;
    if (res.passed) {
      categoryBreakdown[cat].passed++;
    } else {
      categoryBreakdown[cat].failed++;
    }
  }

  for (const cat of Object.keys(categoryBreakdown)) {
    const item = categoryBreakdown[cat];
    item.passRate = item.total > 0 ? parseFloat(((item.passed / item.total) * 100).toFixed(1)) : 0;
  }

  // Aggregate Retrieval Metrics
  const retrievalResults = results.filter((r) => r.category === 'RETRIEVAL' && r.metrics);
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalHitRate = 0;
  const retrievalCount = retrievalResults.length;

  if (retrievalCount > 0) {
    for (const r of retrievalResults) {
      totalPrecision += r.metrics.precision || 0;
      totalRecall += r.metrics.recall || 0;
      totalHitRate += r.metrics.hitRate || 0;
    }
  }

  const retrievalMetrics = {
    meanPrecision: retrievalCount > 0 ? parseFloat((totalPrecision / retrievalCount).toFixed(2)) : 1.0,
    meanRecall: retrievalCount > 0 ? parseFloat((totalRecall / retrievalCount).toFixed(2)) : 1.0,
    hitRate: retrievalCount > 0 ? parseFloat((totalHitRate / retrievalCount).toFixed(2)) : 1.0,
  };

  return {
    totalCases,
    passedCases,
    failedCases,
    passRate,
    categoryBreakdown,
    retrievalMetrics,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Format evaluation metrics into a human-readable, zero-PHI report
 *
 * @param {Object} metrics - Output of aggregateEvaluationMetrics
 * @returns {string} Formatted CLI / log summary
 */
const formatEvaluationReport = (metrics) => {
  const lines = [];
  lines.push('====================================================');
  lines.push('       HEALTHBRIDGE AI EVALUATION SUITE RESULTS     ');
  lines.push('====================================================');
  lines.push(`Total Evaluation Cases: ${metrics.totalCases}`);
  lines.push(`Passed:                 ${metrics.passedCases}`);
  lines.push(`Failed:                 ${metrics.failedCases}`);
  lines.push(`Overall Pass Rate:      ${metrics.passRate}%`);
  lines.push('----------------------------------------------------');
  lines.push('RETRIEVAL METRICS:');
  lines.push(`  Precision:            ${metrics.retrievalMetrics.meanPrecision * 100}%`);
  lines.push(`  Recall:               ${metrics.retrievalMetrics.meanRecall * 100}%`);
  lines.push(`  Hit Rate:             ${metrics.retrievalMetrics.hitRate * 100}%`);
  lines.push('----------------------------------------------------');
  lines.push('CATEGORY BREAKDOWN:');

  for (const [cat, data] of Object.entries(metrics.categoryBreakdown)) {
    const padCat = cat.padEnd(22, ' ');
    lines.push(`  ${padCat}: ${data.passed}/${data.total} passed (${data.passRate}%)`);
  }

  lines.push('====================================================');
  return lines.join('\n');
};

module.exports = {
  aggregateEvaluationMetrics,
  formatEvaluationReport,
};
