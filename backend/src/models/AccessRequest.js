const mongoose = require('mongoose');

const ACCESS_REQUEST_SCOPES = [
  'VISITS',
  'DIAGNOSES',
  'MEDICATIONS',
  'LAB_RESULTS',
  'PRESCRIPTIONS',
  'DOCUMENTS',
];

const ACCESS_REQUEST_PURPOSES = ['TREATMENT', 'EMERGENCY', 'RESEARCH', 'REFERRAL'];

const ACCESS_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED'];

const accessRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    requestingDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Requesting doctor reference is required'],
      index: true,
    },
    requestingHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Requesting hospital reference is required'],
      index: true,
    },
    sourceHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Source hospital reference is required'],
      index: true,
    },
    requestedScopes: {
      type: [
        {
          type: String,
          enum: {
            values: ACCESS_REQUEST_SCOPES,
            message: '{VALUE} is not a valid scope',
          },
        },
      ],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one requested scope is required',
      },
    },
    normalizedScopesKey: {
      type: String,
      required: [true, 'Normalized scopes key is required'],
      index: true,
    },
    purpose: {
      type: String,
      enum: {
        values: ACCESS_REQUEST_PURPOSES,
        message: '{VALUE} is not a valid purpose',
      },
      default: 'TREATMENT',
    },
    status: {
      type: String,
      enum: {
        values: ACCESS_REQUEST_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'PENDING',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    deniedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    decisionReason: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days request expiration
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

// Normalize scopes helper
accessRequestSchema.statics.computeNormalizedScopesKey = function (scopes) {
  if (!Array.isArray(scopes)) return '';
  return [...new Set(scopes)].sort().join(',');
};

// Hook: automatically compute normalizedScopesKey before validation
accessRequestSchema.pre('validate', function (next) {
  if (this.requestedScopes && Array.isArray(this.requestedScopes)) {
    this.normalizedScopesKey = [...new Set(this.requestedScopes)].sort().join(',');
  }
  next();
});

// Partial Unique Compound Index: Only one PENDING request per doctor, patient, requesting hosp, source hosp, and scope combination
accessRequestSchema.index(
  {
    requestingDoctor: 1,
    patient: 1,
    requestingHospital: 1,
    sourceHospital: 1,
    normalizedScopesKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
  }
);

// Query indexes
accessRequestSchema.index({ patient: 1, status: 1 });
accessRequestSchema.index({ requestingDoctor: 1, status: 1 });
accessRequestSchema.index({ requestingHospital: 1, status: 1 });
accessRequestSchema.index({ sourceHospital: 1, status: 1 });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema, 'access_requests');

module.exports = {
  AccessRequest,
  ACCESS_REQUEST_SCOPES,
  ACCESS_REQUEST_PURPOSES,
  ACCESS_REQUEST_STATUSES,
};
