const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  // Authentication
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  // User / Identity
  'USER_CREATED',
  'USER_ROLE_CHANGED',
  // Hospital
  'HOSPITAL_CREATED',
  'HOSPITAL_STATUS_CHANGED',
  // Doctor
  'DOCTOR_PROFILE_CREATED',
  'DOCTOR_PROFILE_UPDATED',
  'DOCTOR_AFFILIATION_REQUESTED',
  'DOCTOR_AFFILIATION_APPROVED',
  'DOCTOR_AFFILIATION_REJECTED',
  'DOCTOR_AFFILIATION_SUSPENDED',
  // Doctor–Patient Assignment
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ENDED',
  // Medical Records
  'MEDICAL_RECORD_CREATED',
  'MEDICAL_RECORD_VIEWED',
  'MEDICAL_RECORD_UPDATED',
  'MEDICAL_RECORD_ACCESS_DENIED',
  // Cross-Hospital Access
  'ACCESS_REQUEST_CREATED',
  'ACCESS_REQUEST_APPROVED',
  'ACCESS_REQUEST_DENIED',
  'ACCESS_REQUEST_CANCELLED',
  // Consent
  'CONSENT_CREATED',
  'CONSENT_REVOKED',
  'CONSENT_ACCESS_DENIED',
  // Appointments
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REJECTED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_COMPLETED',
  'APPOINTMENT_NO_SHOW',
  // Security
  'UNAUTHORIZED_ACCESS_ATTEMPT',
  'TENANT_ACCESS_DENIED',
  'ADMIN_CLINICAL_ACCESS_DENIED',
];

const AUDIT_RESOURCE_TYPES = [
  'USER',
  'PATIENT',
  'DOCTOR',
  'HOSPITAL',
  'ASSIGNMENT',
  'MEDICAL_RECORD',
  'ACCESS_REQUEST',
  'CONSENT',
  'APPOINTMENT',
  'AUTHENTICATION',
  'SYSTEM',
];

const AUDIT_RESULTS = ['SUCCESS', 'DENIED', 'FAILURE'];

const AUDIT_ACTOR_ROLES = [
  'SYSTEM_ADMIN',
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'PATIENT',
  'SYSTEM',
  'ANONYMOUS',
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: AUDIT_ACTOR_ROLES,
      default: 'ANONYMOUS',
    },
    action: {
      type: String,
      enum: {
        values: AUDIT_ACTIONS,
        message: '{VALUE} is not a valid audit action',
      },
      required: [true, 'Audit action is required'],
      index: true,
    },
    resourceType: {
      type: String,
      enum: {
        values: AUDIT_RESOURCE_TYPES,
        message: '{VALUE} is not a valid resource type',
      },
      required: [true, 'Audit resource type is required'],
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      index: true,
    },
    result: {
      type: String,
      enum: {
        values: AUDIT_RESULTS,
        message: '{VALUE} is not a valid audit result',
      },
      required: [true, 'Audit result is required'],
      index: true,
    },
    reasonCode: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable events don't update
    collection: 'audit_logs',
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

// Compound indexes for performant audit queries
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ patient: 1, createdAt: -1 });
auditLogSchema.index({ hospital: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ result: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Prevent in-place document updates on model instances to ensure immutability
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be modified once created.'));
  }
  next();
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESULTS,
  AUDIT_ACTOR_ROLES,
};
