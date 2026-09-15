const crypto = require('crypto');
const { Hospital } = require('../models/Hospital');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

// Strict lifecycle state transition rules per requirements
const ALLOWED_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
  REJECTED: [],
  SUSPENDED: [],
};

/**
 * Generates a unique, stable, human-readable hospital code.
 * Format: HOSP-XXXXXX (where X is uppercase alphanumeric)
 */
const generateUniqueHospitalCode = async () => {
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    code = `HOSP-${randomPart}`;
    const existing = await Hospital.findOne({ hospitalCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Registers a new hospital.
 * Ensures initial status is always PENDING and links registeredBy user.
 */
const createHospital = async ({ data, registeredByUserId }) => {
  let hospitalCode = data.hospitalCode;

  if (hospitalCode) {
    hospitalCode = hospitalCode.toUpperCase();
    const existing = await Hospital.findOne({ hospitalCode });
    if (existing) {
      throw new ConflictError(
        `Hospital with code '${hospitalCode}' already exists`,
        'HOSPITAL_CODE_ALREADY_EXISTS'
      );
    }
  } else {
    hospitalCode = await generateUniqueHospitalCode();
  }

  // Check for duplicate hospital with exact name in same city
  const duplicateName = await Hospital.findOne({
    name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
    'address.city': { $regex: new RegExp(`^${data.address.city.trim()}$`, 'i') },
  });

  if (duplicateName) {
    throw new ConflictError(
      `A hospital named '${data.name.trim()}' is already registered in '${data.address.city.trim()}'`,
      'HOSPITAL_NAME_ALREADY_EXISTS'
    );
  }

  const hospital = await Hospital.create({
    name: data.name.trim(),
    hospitalCode,
    address: {
      street: data.address.street?.trim() || '',
      city: data.address.city.trim(),
      state: data.address.state.trim(),
      postalCode: data.address.postalCode?.trim() || '',
      country: data.address.country?.trim() || 'India',
    },
    contactEmail: data.contactEmail.toLowerCase().trim(),
    contactPhone: data.contactPhone.trim(),
    status: 'PENDING', // Initial status is ALWAYS PENDING
    registeredBy: registeredByUserId,
  });

  return hospital;
};

/**
 * Retrieves a list of hospitals with optional status filtering.
 */
const getHospitals = async (filter = {}) => {
  const query = {};
  if (filter.status) {
    query.status = filter.status;
  }

  const hospitals = await Hospital.find(query)
    .populate('registeredBy', 'name email')
    .sort({ createdAt: -1 });

  return hospitals;
};

/**
 * Retrieves a single hospital by its MongoDB ID.
 */
const getHospitalById = async (id) => {
  const hospital = await Hospital.findById(id).populate('registeredBy', 'name email');
  if (!hospital) {
    throw new NotFoundError(`Hospital with ID '${id}' was not found`, 'HOSPITAL_NOT_FOUND');
  }
  return hospital;
};

/**
 * Updates a hospital's lifecycle status following strict state transition rules.
 */
const updateHospitalStatus = async ({ hospitalId, newStatus }) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError(`Hospital with ID '${hospitalId}' was not found`, 'HOSPITAL_NOT_FOUND');
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[hospital.status] || [];
  if (!allowedNextStatuses.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition hospital status from '${hospital.status}' to '${newStatus}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  hospital.status = newStatus;
  await hospital.save();

  return hospital;
};

module.exports = {
  createHospital,
  getHospitals,
  getHospitalById,
  updateHospitalStatus,
  ALLOWED_TRANSITIONS,
};
