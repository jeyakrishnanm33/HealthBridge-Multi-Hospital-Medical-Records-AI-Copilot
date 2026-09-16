const mongoose = require('mongoose');

/**
 * Controlled vocabulary for notification types.
 */
const NOTIFICATION_TYPES = [
  // Doctor affiliation lifecycle
  'DOCTOR_AFFILIATION_APPROVED',
  'DOCTOR_AFFILIATION_REJECTED',
  'DOCTOR_AFFILIATION_SUSPENDED',

  // Clinical assignments
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ENDED',

  // Cross-hospital access requests
  'ACCESS_REQUEST_CREATED',
  'ACCESS_REQUEST_APPROVED',
  'ACCESS_REQUEST_DENIED',
  'ACCESS_REQUEST_CANCELLED',

  // Patient consent
  'CONSENT_CREATED',
  'CONSENT_REVOKED',
  'CONSENT_EXPIRING',

  // Hospital lifecycle
  'HOSPITAL_APPROVED',
  'HOSPITAL_REJECTED',
  'HOSPITAL_SUSPENDED',

  // Appointments
  'APPOINTMENT_REQUESTED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REJECTED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_COMPLETED',
  'APPOINTMENT_NO_SHOW',

  // Account and security
  'SECURITY_EVENT',
  'ACCOUNT_EVENT',
];

/**
 * Controlled vocabulary for resource types.
 */
const RESOURCE_TYPES = [
  'DOCTOR',
  'ASSIGNMENT',
  'ACCESS_REQUEST',
  'CONSENT',
  'HOSPITAL',
  'USER',
  'PATIENT',
  'MEDICAL_RECORD',
  'APPOINTMENT',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: NOTIFICATION_TYPES,
        message: 'Invalid notification type: {VALUE}',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    resourceType: {
      type: String,
      enum: {
        values: RESOURCE_TYPES,
        message: 'Invalid resource type: {VALUE}',
      },
      default: null,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['UNREAD', 'READ'],
      default: 'UNREAD',
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Compound indexes for performant bounded queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  Notification,
  NOTIFICATION_TYPES,
  RESOURCE_TYPES,
};
