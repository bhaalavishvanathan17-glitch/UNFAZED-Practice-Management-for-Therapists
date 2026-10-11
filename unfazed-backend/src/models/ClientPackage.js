const mongoose = require('mongoose');

const clientPackageSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
    index: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true,
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  },
  packageTitle: {
    type: String,
    required: true,
  },
  totalSessions: {
    type: Number,
    required: true,
    min: 1,
  },
  usedSessions: {
    type: Number,
    default: 0,
    min: 0,
  },
  validityDays: {
    type: Number,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'exhausted', 'expired'],
    default: 'active',
    index: true,
  },
}, {
  timestamps: true,
});

// Virtual for remaining session credits
clientPackageSchema.virtual('remainingSessions').get(function () {
  return Math.max(0, this.totalSessions - this.usedSessions);
});

clientPackageSchema.set('toJSON', { virtuals: true });
clientPackageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClientPackage', clientPackageSchema);
