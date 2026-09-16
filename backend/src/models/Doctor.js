const mongoose = require('mongoose');

const DOCTOR_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED'];
const DOCTOR_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: DOCTOR_GENDERS,
        message: '{VALUE} is not a valid gender',
      },
      required: [true, 'Gender is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    medicalLicenseNumber: {
      type: String,
      required: [true, 'Medical license number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    qualifications: {
      type: [String],
      required: [true, 'Qualifications are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one qualification is required',
      },
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [0, 'Years of experience cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: DOCTOR_STATUSES,
        message: '{VALUE} is not a valid doctor status',
      },
      default: 'PENDING',
    },
  },
  {
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

const Doctor = mongoose.model('Doctor', doctorSchema, 'doctors');

module.exports = {
  Doctor,
  DOCTOR_STATUSES,
  DOCTOR_GENDERS,
};
