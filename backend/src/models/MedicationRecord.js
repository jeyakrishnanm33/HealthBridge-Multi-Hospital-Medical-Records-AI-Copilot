const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const medicationRecordSchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'],
    trim: true,
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    trim: true,
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true,
  },
  instructions: {
    type: String,
    trim: true,
    default: '',
  },
});

const MedicationRecord = MedicalRecord.discriminator('MEDICATION', medicationRecordSchema);

module.exports = {
  MedicationRecord,
};
