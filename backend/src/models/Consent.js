const mongoose = require('mongoose');
const { ACCESS_REQUEST_SCOPES, ACCESS_REQUEST_PURPOSES } = require('./AccessRequest');

const CONSENT_SCOPES = ACCESS_REQUEST_SCOPES;
const CONSENT_PURPOSES = ACCESS_REQUEST_PURPOSES;

const consentSchema = new mongoose.Schema(
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
    accessRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessRequest',
      default: null,
    },
    scopes: {
      type: [
        {
          type: String,
          enum: {
            values: CONSENT_SCOPES,
            message: '{VALUE} is not a valid consent scope',
          },
        },
      ],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one authorized scope is required',
      },
    },
    purpose: {
      type: String,
      enum: {
        values: CONSENT_PURPOSES,
        message: '{VALUE} is not a valid purpose',
      },
      default: 'TREATMENT',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'grantedBy user reference is required'],
    },
    revokedBy: {
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
        // Compute dynamic effective status
        if (ret.revokedAt) {
          ret.effectiveStatus = 'REVOKED';
        } else if (new Date(ret.expiresAt) <= new Date()) {
          ret.effectiveStatus = 'EXPIRED';
        } else {
          ret.effectiveStatus = 'ACTIVE';
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Method: compute effective status dynamically
consentSchema.methods.getEffectiveStatus = function () {
  if (this.revokedAt) return 'REVOKED';
  if (new Date(this.expiresAt) <= new Date()) return 'EXPIRED';
  return 'ACTIVE';
};

// Query indexes for clinical verification
consentSchema.index({
  patient: 1,
  requestingDoctor: 1,
  sourceHospital: 1,
  requestingHospital: 1,
});
consentSchema.index({ patient: 1, expiresAt: 1, revokedAt: 1 });

const Consent = mongoose.model('Consent', consentSchema, 'consents');

module.exports = {
  Consent,
  CONSENT_SCOPES,
  CONSENT_PURPOSES,
};
