const mongoose = require('mongoose');

/**
 * Consent record schema for auditing legal/clinical consent
 */
const consentRecordSchema = new mongoose.Schema({
  agreed: {
    type: Boolean,
    required: true,
    default: true,
  },
  agreedAt: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1',
  },
  consentVersion: {
    type: String,
    default: 'v1.0-standard-telehealth-consent',
  },
  consentText: {
    type: String,
    default: 'I agree to the practice terms and understand this session is governed by client confidentiality and ethical counseling standards.',
  },
}, { _id: false });

/**
 * Intake form answers schema
 */
const intakeFormSchema = new mongoose.Schema({
  dateOfBirth: {
    type: String,
    default: '',
  },
  gender: {
    type: String,
    enum: ['female', 'male', 'non-binary', 'prefer-not-to-say', 'other', ''],
    default: '',
  },
  emergencyContactName: {
    type: String,
    default: '',
    trim: true,
  },
  emergencyContactPhone: {
    type: String,
    default: '',
    trim: true,
  },
  emergencyContactRelation: {
    type: String,
    default: '',
    trim: true,
  },
  presentingConcerns: {
    type: [String],
    default: [], // e.g. ['Anxiety', 'Sleep issues', 'Work stress']
  },
  priorTherapyExperience: {
    type: String,
    enum: ['yes', 'no', ''],
    default: '',
  },
  currentMedications: {
    type: String,
    default: '',
  },
  goalsForTherapy: {
    type: String,
    default: '',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const clientSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospective', 'completed'],
    default: 'active',
    index: true,
  },
  tags: {
    type: [String],
    default: ['Individual'], // e.g. ['CBT', 'Couples', 'Weekly', 'High Priority']
  },
  internalNotes: {
    type: String,
    default: '',
  },
  intakeCompleted: {
    type: Boolean,
    default: false,
  },
  intakeForm: {
    type: intakeFormSchema,
    default: null,
  },
  consentRecord: {
    type: consentRecordSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

// Enforce unique client email PER therapist (a client can see multiple therapists, but only one record per therapist)
clientSchema.index({ therapistId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);
