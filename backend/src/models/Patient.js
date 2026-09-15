const mongoose = require('mongoose');

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PATIENT_STATUSES = ['ACTIVE', 'INACTIVE'];

const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    relationship: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: {
        values: GENDERS,
        message: '{VALUE} is not a valid gender',
      },
      required: [true, 'Gender is required'],
    },
    bloodGroup: {
      type: String,
      enum: {
        values: BLOOD_GROUPS,
        message: '{VALUE} is not a valid blood group',
      },
      default: null,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: addressSchema,
      required: [true, 'Address is required'],
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: PATIENT_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'ACTIVE',
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

const Patient = mongoose.model('Patient', patientSchema, 'patients');

module.exports = {
  Patient,
  GENDERS,
  BLOOD_GROUPS,
  PATIENT_STATUSES,
};
