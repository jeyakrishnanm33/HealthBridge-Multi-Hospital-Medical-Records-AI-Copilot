/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Throttles expensive AI Assistant queries per authenticated user or IP.
 */
const env = require('../config/env');
const { AppError } = require('../errors/AppError');

const requestCounts = new Map();

// Periodic cleanup of stale sliding windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestCounts.entries()) {
    const validTimestamps = timestamps.filter(
      (ts) => now - ts < env.AI_ASSISTANT_RATE_LIMIT_WINDOW_MS
    );
    if (validTimestamps.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validTimestamps);
    }
  }
}, 300000).unref();

const createRateLimiter = (options = {}) => {
  const maxRequests = options.max || env.AI_ASSISTANT_RATE_LIMIT_MAX || 30;
  const windowMs = options.windowMs || env.AI_ASSISTANT_RATE_LIMIT_WINDOW_MS || 60000;

  return (req, res, next) => {
    // In test environment, allow bypassing unless explicitly testing rate limits
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const identifier = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    const timestamps = requestCounts.get(identifier) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (validTimestamps[0] + windowMs - now) / 1000
      );
      res.setHeader('Retry-After', Math.max(1, retryAfterSeconds));
      return next(
        new AppError(
          `Rate limit exceeded. Please wait before asking another clinical question.`,
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    validTimestamps.push(now);
    requestCounts.set(identifier, validTimestamps);
    next();
  };
};

const assistantRateLimiter = createRateLimiter();

module.exports = {
  createRateLimiter,
  assistantRateLimiter,
};
