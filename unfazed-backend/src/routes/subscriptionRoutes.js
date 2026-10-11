const express = require('express');
const router = express.Router();
const {
  getMySubscription,
  getAvailablePlans,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription,
  getUsageStats,
} = require('../controllers/subscriptionController');
const { protectTherapist } = require('../middleware/auth');

// ─── Public ───────────────────────────────────────────────────────
// List available plans (pricing page, onboarding flow)
router.get('/plans', getAvailablePlans);

// ─── Protected (Therapist) ───────────────────────────────────────
// Current subscription + tier info
router.get('/me', protectTherapist, getMySubscription);

// Real-time usage breakdown
router.get('/usage', protectTherapist, getUsageStats);

// Create a new subscription
router.post('/', protectTherapist, createSubscription);

// Upgrade or downgrade tier
router.put('/upgrade', protectTherapist, upgradeSubscription);

// Cancel active subscription (reverts to starter)
router.put('/cancel', protectTherapist, cancelSubscription);

// Renew subscription (reset usage counters for new billing period)
router.put('/renew', protectTherapist, renewSubscription);

module.exports = router;
