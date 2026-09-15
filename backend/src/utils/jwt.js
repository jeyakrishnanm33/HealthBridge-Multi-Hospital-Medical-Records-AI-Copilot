const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a JWT for an authenticated user.
 * @param {Object} payload - Token claims (at minimum: { sub: userId, role: userRole })
 * @param {string} [expiresIn] - Optional custom expiration duration
 * @returns {string} signed JWT string
 */
const generateToken = (payload, expiresIn = env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
  });
};

/**
 * Verifies a JWT token signature and expiration.
 * @param {string} token
 * @returns {Object} decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
