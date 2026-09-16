const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const DIAGNOSIS_STATUSES = ['PROVISIONAL', 'CONFIRMED', 'RESOLVED'];

const diagnosisRecordSchema = new mongoose.Schema({
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
  },
  condition: {
    type: String,
    trim: true,
    default: '',
  },
  icdCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  status: {
    type: String,
    enum: {
      values: DIAGNOSIS_STATUSES,
      message: '{VALUE} is not a valid diagnosis status',
    },
    default: 'PROVISIONAL',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const DiagnosisRecord = MedicalRecord.discriminator('DIAGNOSIS', diagnosisRecordSchema);

module.exports = {
  DiagnosisRecord,
  DIAGNOSIS_STATUSES,
};
