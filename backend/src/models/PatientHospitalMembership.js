const mongoose = require('mongoose');

const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE'];

const ALLOWED_TRANSITIONS = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['INACTIVE'],
  REJECTED: [],
  INACTIVE: [],
};

const patientHospitalMembershipSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: MEMBERSHIP_STATUSES,
        message: '{VALUE} is not a valid membership status',
      },
      default: 'PENDING',
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Unique compound index: one patient can have at most one membership record for a specific hospital
patientHospitalMembershipSchema.index({ patient: 1, hospital: 1 }, { unique: true });

const PatientHospitalMembership = mongoose.model(
  'PatientHospitalMembership',
  patientHospitalMembershipSchema,
  'patientHospitalMemberships'
);

module.exports = {
  PatientHospitalMembership,
  MEMBERSHIP_STATUSES,
  ALLOWED_TRANSITIONS,
};
