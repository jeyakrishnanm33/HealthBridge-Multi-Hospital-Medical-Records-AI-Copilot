const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const LAB_INTERPRETATIONS = ['NORMAL', 'ABNORMAL', 'CRITICAL'];

const labResultRecordSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true,
  },
  value: {
    type: String,
    required: [true, 'Value is required'],
    trim: true,
  },
  unit: {
    type: String,
    trim: true,
    default: '',
  },
  referenceRange: {
    type: String,
    trim: true,
    default: '',
  },
  interpretation: {
    type: String,
    enum: {
      values: LAB_INTERPRETATIONS,
      message: '{VALUE} is not a valid interpretation',
    },
    default: 'NORMAL',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const LabResultRecord = MedicalRecord.discriminator('LAB_RESULT', labResultRecordSchema);

module.exports = {
  LabResultRecord,
  LAB_INTERPRETATIONS,
};
