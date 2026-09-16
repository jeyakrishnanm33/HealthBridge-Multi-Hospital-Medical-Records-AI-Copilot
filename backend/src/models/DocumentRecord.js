const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const DOCUMENT_TYPES = [
  'DISCHARGE_SUMMARY',
  'LAB_REPORT',
  'IMAGING_SCAN',
  'CLINICAL_NOTE',
  'PRESCRIPTION_SCAN',
  'OTHER',
];

const documentRecordSchema = new mongoose.Schema({
  documentType: {
    type: String,
    enum: {
      values: DOCUMENT_TYPES,
      message: '{VALUE} is not a valid document type',
    },
    default: 'CLINICAL_NOTE',
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true,
  },
  storageReference: {
    type: String,
    required: [true, 'Storage reference is required'],
    trim: true,
  },
  fileSize: {
    type: Number,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const DocumentRecord = MedicalRecord.discriminator('DOCUMENT', documentRecordSchema);

module.exports = {
  DocumentRecord,
  DOCUMENT_TYPES,
};
