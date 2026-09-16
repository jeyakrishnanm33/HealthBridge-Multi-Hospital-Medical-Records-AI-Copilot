const { AsyncLocalStorage } = require('node:async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Executes a callback within a request context.
 *
 * @param {Object} context - { requestId, ipAddress, userAgent, actor }
 * @param {Function} callback - Function to execute
 * @returns {*} Return value of callback
 */
function runWithContext(context, callback) {
  return asyncLocalStorage.run(context || {}, callback);
}

/**
 * Returns the current request context or an empty object.
 *
 * @returns {Object} Current request context
 */
function getContext() {
  return asyncLocalStorage.getStore() || {};
}

/**
 * Returns the active request ID from context if present.
 *
 * @returns {string|null}
 */
function getRequestId() {
  const store = asyncLocalStorage.getStore();
  return store?.requestId || null;
}

/**
 * Updates a specific key in the current store if available.
 *
 * @param {string} key
 * @param {*} value
 */
function setContext(key, value) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store[key] = value;
  }
}

module.exports = {
  runWithContext,
  getContext,
  getRequestId,
  setContext,
};
