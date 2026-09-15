const mongoose = require('mongoose');

const ROLES = ['SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'PATIENT'];
const STATUSES = ['ACTIVE', 'INACTIVE'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not include in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: '{VALUE} is not a valid role',
      },
      default: 'PATIENT',
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Method to return safe public user object
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema, 'users');

module.exports = {
  User,
  ROLES,
  STATUSES,
};
