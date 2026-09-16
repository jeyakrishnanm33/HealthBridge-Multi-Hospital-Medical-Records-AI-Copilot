const authService = require('../services/authService');
const auditService = require('../services/auditService');

/**
 * POST /api/auth/register
 * Handles user account creation.
 */
const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Handles user authentication and token issuance.
 */
const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.status(200).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Retrieves the currently authenticated user's profile.
 * Requires authenticate middleware.
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Stateless token logout endpoint.
 * Instructs the client to discard its stored bearer token.
 */
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await auditService.recordSuccess('LOGOUT', 'AUTHENTICATION', req.user.id, {
        actor: req.user.id,
        actorRole: req.user.role,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Client should discard authentication token.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
