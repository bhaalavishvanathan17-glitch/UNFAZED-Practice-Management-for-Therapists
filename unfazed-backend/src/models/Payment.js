const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: [true, 'Therapist ID is required'],
    index: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null,
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
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null,
    index: true,
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    default: null,
    index: true,
  },
  itemType: {
    type: String,
    enum: ['single_session', 'package'],
    required: true,
  },
  itemTitle: {
    type: String,
    required: true,
    trim: true,
  },
  // Exact integer representation in paise (1 INR = 100 paise)
  amountPaise: {
    type: Number,
    required: [true, 'Amount in paise is required'],
    min: [100, 'Minimum payment amount is 100 paise (₹1)'],
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  platformFeePaise: {
    type: Number,
    default: 0,
    min: 0,
  },
  netAmountPaise: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true,
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
    index: true,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },
  paymentMethod: {
    type: String,
    default: 'test_mode',
  },
  isTestMode: {
    type: Boolean,
    default: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  webhookEvents: [{
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed },
  }],
  errorMessage: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Compound index for therapist payment ledger queries
paymentSchema.index({ therapistId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
