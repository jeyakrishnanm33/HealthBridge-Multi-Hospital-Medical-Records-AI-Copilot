const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');

const visitRecordSchema = new mongoose.Schema({
  symptoms: {
    type: [String],
    default: [],
  },
  diagnosis: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  vitalSigns: {
    bloodPressure: { type: String, trim: true, default: '' },
    heartRate: { type: Number, default: null },
    temperature: { type: Number, default: null },
    respiratoryRate: { type: Number, default: null },
    oxygenSaturation: { type: Number, default: null },
  },
});

const VisitRecord = MedicalRecord.discriminator('VISIT', visitRecordSchema);

module.exports = {
  VisitRecord,
};
