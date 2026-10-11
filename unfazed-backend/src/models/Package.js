const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: [true, 'Therapist ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Package title is required'],
    trim: true,
  },
  sessionCount: {
    type: Number,
    required: [true, 'Session count is required'],
    enum: [3, 6, 12, 15, 20],
  },
  durationMinutes: {
    type: Number,
    required: true,
    enum: [30, 45, 60, 90],
    default: 60,
  },
  pricePaise: {
    type: Number,
    required: [true, 'Package price in paise is required'],
    min: [100, 'Price must be positive'],
  },
  perSessionPricePaise: {
    type: Number,
    required: true,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  validityDays: {
    type: Number,
    required: true,
    default: 90, // e.g. 90 days validity
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Calculate perSessionPricePaise automatically before saving if not provided
packageSchema.pre('save', function () {
  if (this.pricePaise && this.sessionCount) {
    this.perSessionPricePaise = Math.round(this.pricePaise / this.sessionCount);
  }
});

module.exports = mongoose.model('Package', packageSchema);
