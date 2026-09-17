/**
 * Clinical Tool Registry
 * Single entry point for tool definitions, schema declarations, and execution engine.
 */
const { CLINICAL_TOOLS, getToolDefinitions } = require('./toolDefinitions');
const { executeToolCall, executeToolCalls } = require('./toolExecutor');
const { toolValidators } = require('./toolValidators');

module.exports = {
  CLINICAL_TOOLS,
  getToolDefinitions,
  executeToolCall,
  executeToolCalls,
  toolValidators,
};
