// Subscription model – defines a therapist's subscription tier and usage limits
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist ID is required'],
      index: true,
    },
    tier: {
      type: String,
      enum: ['starter', 'professional', 'clinic'],
      default: 'starter',
    },
    // Period of subscription – startDate required, endDate optional (null = ongoing)
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    // Usage counters – reset when subscription is renewed
    sessionsUsed: { type: Number, default: 0 },
    packagesUsed: { type: Number, default: 0 },
    // Feature flags – allow future expansion of per‑tier capabilities
    features: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
