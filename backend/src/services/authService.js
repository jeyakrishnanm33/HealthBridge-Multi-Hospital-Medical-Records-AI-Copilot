const { User } = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../errors/AppError');
const auditService = require('./auditService');

/**
 * Sanitizes a Mongoose user document or object into a safe public representation.
 * Guarantees passwordHash is never leaked.
 */
const toSafeUser = (user) => {
  if (typeof user.toSafeObject === 'function') {
    return user.toSafeObject();
  }
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Registers a new user account.
 * Enforces email normalization, uniqueness, password hashing, and token issuance.
 */
const register = async ({ name, email, password, role = 'PATIENT' }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if account with email already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError('An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    status: 'ACTIVE',
  });

  // Issue authentication JWT
  const token = generateToken({
    sub: user._id.toString(),
    role: user.role,
  });

  await auditService.recordSuccess('USER_CREATED', 'USER', user._id, {
    actor: user._id,
    actorRole: user.role,
    metadata: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

/**
 * Authenticates user credentials and issues a JWT.
 * Returns consistent error for missing user or bad password to prevent enumeration.
 */
const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Explicitly select passwordHash since it is excluded by default on the schema
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    await auditService.recordDenied('LOGIN_FAILURE', 'AUTHENTICATION', null, 'INVALID_CREDENTIALS', {
      actorRole: 'ANONYMOUS',
      metadata: { attemptedEmail: normalizedEmail },
    });
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await auditService.recordDenied('LOGIN_FAILURE', 'AUTHENTICATION', user._id, 'INVALID_CREDENTIALS', {
      actor: user._id,
      actorRole: user.role,
      metadata: { attemptedEmail: normalizedEmail },
    });
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'ACTIVE') {
    await auditService.recordDenied('LOGIN_FAILURE', 'AUTHENTICATION', user._id, 'ACCOUNT_INACTIVE', {
      actor: user._id,
      actorRole: user.role,
      metadata: { attemptedEmail: normalizedEmail },
    });
    throw new UnauthorizedError('Account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
  }

  // Issue authentication JWT
  const token = generateToken({
    sub: user._id.toString(),
    role: user.role,
  });

  await auditService.recordSuccess('LOGIN_SUCCESS', 'AUTHENTICATION', user._id, {
    actor: user._id,
    actorRole: user.role,
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  return {
    user: toSafeUser(user),
    token,
  };
};

/**
 * Retrieves the current authenticated user's profile.
 */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }
  return toSafeUser(user);
};

module.exports = {
  toSafeUser,
  register,
  login,
  getCurrentUser,
};
