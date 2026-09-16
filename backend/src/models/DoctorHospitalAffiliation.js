const mongoose = require('mongoose');

const AFFILIATION_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];

const ALLOWED_DOCTOR_AFFILIATION_TRANSITIONS = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED'],
  REJECTED: [],
  SUSPENDED: [],
};

const doctorHospitalAffiliationSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital reference is required'],
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: AFFILIATION_STATUSES,
        message: '{VALUE} is not a valid doctor affiliation status',
      },
      default: 'PENDING',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
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

// Compound unique index preventing duplicate affiliations between a doctor and a hospital
doctorHospitalAffiliationSchema.index({ doctor: 1, hospital: 1 }, { unique: true });

const DoctorHospitalAffiliation = mongoose.model(
  'DoctorHospitalAffiliation',
  doctorHospitalAffiliationSchema,
  'doctorHospitalAffiliations'
);

module.exports = {
  DoctorHospitalAffiliation,
  AFFILIATION_STATUSES,
  ALLOWED_DOCTOR_AFFILIATION_TRANSITIONS,
};
