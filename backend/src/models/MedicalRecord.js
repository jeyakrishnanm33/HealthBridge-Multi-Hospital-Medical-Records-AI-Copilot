const mongoose = require('mongoose');

const RECORD_TYPES = [
  'VISIT',
  'DIAGNOSIS',
  'MEDICATION',
  'LAB_RESULT',
  'PRESCRIPTION',
  'DOCUMENT',
];

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital reference is required'],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    recordType: {
      type: String,
      required: [true, 'Record type is required'],
      enum: {
        values: RECORD_TYPES,
        message: '{VALUE} is not a valid record type',
      },
    },
    recordDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Record date is required'],
    },
  },
  {
    discriminatorKey: 'recordType',
    collection: 'medical_records',
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

// Compound index for efficient patient timeline queries
medicalRecordSchema.index({ patient: 1, recordDate: -1 });
medicalRecordSchema.index({ hospital: 1, recordDate: -1 });
medicalRecordSchema.index({ doctor: 1, recordDate: -1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema, 'medical_records');

module.exports = {
  MedicalRecord,
  RECORD_TYPES,
};
