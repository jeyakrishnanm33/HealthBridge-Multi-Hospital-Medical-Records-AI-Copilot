const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');
const auditService = require('../services/auditService');

/**
 * Minimal role gate middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Full resource-level authorization policies belong to Phase 6.
 *
 * @param {...string} allowedRoles
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'AUTHENTICATION_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      auditService
        .recordDenied('UNAUTHORIZED_ACCESS_ATTEMPT', 'SYSTEM', null, 'FORBIDDEN', {
          actor: req.user.id,
          actorRole: req.user.role,
          metadata: { path: req.originalUrl || req.path, method: req.method },
        })
        .catch(() => {});

      return next(
        new ForbiddenError(
          `User role '${req.user.role}' is not authorized to perform this operation`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

module.exports = {
  requireRoles,
};
