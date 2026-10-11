const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
    index: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null, // Will connect to Client model in Module 3
    index: true,
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
  },
  clientPhone: {
    type: String,
    default: '',
    trim: true,
  },
  serviceTitle: {
    type: String,
    default: 'Individual Therapy',
  },
  durationMinutes: {
    type: Number,
    required: true,
    enum: [30, 45, 60, 90],
    default: 60,
  },
  priceInr: {
    type: Number,
    required: true,
    default: 1500,
  },
  // Stored consistently in UTC
  startDateTime: {
    type: Date,
    required: true,
    index: true,
  },
  endDateTime: {
    type: Date,
    required: true,
    index: true,
  },
  timeZone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  mode: {
    type: String,
    enum: ['video', 'in-person'],
    default: 'video',
  },
  meetingLink: {
    type: String,
    default: 'https://meet.google.com/unfazed-session',
  },
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'confirmed',
  },
  cancellationReason: {
    type: String,
    default: '',
  },
  intakeNotes: {
    type: String,
    default: '',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'waived'],
    default: 'unpaid',
    index: true,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClientPackage',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for querying therapist session conflicts quickly
sessionSchema.index({ therapistId: 1, startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model('Session', sessionSchema);
