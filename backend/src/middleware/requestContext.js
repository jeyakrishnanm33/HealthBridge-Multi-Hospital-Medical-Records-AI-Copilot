const crypto = require('crypto');
const { runWithContext } = require('../utils/requestContext');

// Safe correlation ID format regex (letters, numbers, hyphens, underscores; 1-100 chars)
const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Request context middleware.
 * Assigns or validates incoming x-request-id header, attaches it to the response header,
 * extracts client IP and User-Agent, and enters the AsyncLocalStorage context.
 */
const requestContextMiddleware = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  let requestId;

  if (typeof incomingId === 'string' && SAFE_REQUEST_ID_REGEX.test(incomingId.trim())) {
    requestId = incomingId.trim();
  } else {
    requestId = crypto.randomUUID();
  }

  // Extract IP safely
  const ipAddress =
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  // Extract User-Agent safely (capped at 250 chars)
  const userAgent = (req.get('user-agent') || 'Unknown').slice(0, 250);

  // Attach to request object for legacy/direct access
  req.requestId = requestId;
  req.ipAddress = ipAddress;
  req.userAgent = userAgent;

  // Echo correlation ID back to the client
  res.setHeader('x-request-id', requestId);

  // Run downstream pipeline inside AsyncLocalStorage context
  const context = {
    requestId,
    ipAddress,
    userAgent,
    actor: null, // Will be enriched when authenticate runs
  };

  runWithContext(context, () => {
    next();
  });
};

module.exports = requestContextMiddleware;
