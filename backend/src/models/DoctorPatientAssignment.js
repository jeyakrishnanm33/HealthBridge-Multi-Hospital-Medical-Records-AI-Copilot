const mongoose = require('mongoose');

const ASSIGNMENT_STATUSES = ['ACTIVE', 'ENDED'];

const doctorPatientAssignmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: ASSIGNMENT_STATUSES,
        message: '{VALUE} is not a valid assignment status',
      },
      default: 'ACTIVE',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'assignedBy user reference is required'],
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
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

// Partial unique compound index: only ONE active assignment per (doctor, patient, hospital)
doctorPatientAssignmentSchema.index(
  { doctor: 1, patient: 1, hospital: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
  }
);

const DoctorPatientAssignment = mongoose.model(
  'DoctorPatientAssignment',
  doctorPatientAssignmentSchema,
  'doctor_patient_assignments'
);

module.exports = {
  DoctorPatientAssignment,
  ASSIGNMENT_STATUSES,
};
