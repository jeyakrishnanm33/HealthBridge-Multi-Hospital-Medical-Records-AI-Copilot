const mongoose = require('mongoose');

const HOSPITAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

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
      required: [true, 'Country is required'],
      trim: true,
      default: 'India',
    },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      minlength: [2, 'Hospital name must be at least 2 characters'],
      maxlength: [150, 'Hospital name cannot exceed 150 characters'],
    },
    hospitalCode: {
      type: String,
      required: [true, 'Hospital code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: addressSchema,
      required: [true, 'Hospital address is required'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid contact email format'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: HOSPITAL_STATUSES,
        message: '{VALUE} is not a valid hospital status',
      },
      default: 'PENDING',
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'registeredBy user reference is required'],
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

const Hospital = mongoose.model('Hospital', hospitalSchema, 'hospitals');

module.exports = {
  Hospital,
  HOSPITAL_STATUSES,
};
