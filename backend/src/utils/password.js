const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compares a plain-text password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>} true if match, false otherwise
 */
const comparePassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
