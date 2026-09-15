const env = require('../config/env');
const logger = require('../utils/logger');
const { AppError } = require('../errors/AppError');
const { ZodError } = require('zod');

// Centralized error-handling middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid value for field: ${err.path}`;
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON in request payload';
  } else {
    // Unexpected internal server error
    logger.error(`Unhandled exception on ${req.method} ${req.originalUrl}:`, err);
    if (env.NODE_ENV !== 'production') {
      message = err.message || message;
    }
  }

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
