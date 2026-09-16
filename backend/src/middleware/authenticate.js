const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../errors/AppError');
const { User } = require('../models/User');
const { setContext } = require('../utils/requestContext');

/**
 * Authentication middleware.
 * Verifies Bearer JWT from Authorization header, resolves the user,
 * and attaches the authenticated safe user identity to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is missing', 'TOKEN_MISSING');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization format. Expected "Bearer <token>"', 'TOKEN_MALFORMED');
    }

    const token = parts[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid authentication token', 'INVALID_TOKEN');
    }

    // Verify user exists and is active
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new UnauthorizedError('Authenticated user account no longer exists', 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
    }

    // Attach safe user identity to request
    req.user = user.toSafeObject();
    setContext('actor', req.user);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
