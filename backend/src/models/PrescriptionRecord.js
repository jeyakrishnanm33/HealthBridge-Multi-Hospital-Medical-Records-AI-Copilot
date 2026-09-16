const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const prescribedMedicationSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const prescriptionRecordSchema = new mongoose.Schema({
  medications: {
    type: [prescribedMedicationSchema],
    validate: {
      validator(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Prescription must contain at least one medication',
    },
  },
  instructions: {
    type: String,
    trim: true,
    default: '',
  },
});

const PrescriptionRecord = MedicalRecord.discriminator('PRESCRIPTION', prescriptionRecordSchema);

module.exports = {
  PrescriptionRecord,
};
