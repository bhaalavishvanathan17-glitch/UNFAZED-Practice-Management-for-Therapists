const express = require('express');
const router = express.Router();
const {
  getAdminAnalytics,
  getAnalyticsOverview,
  getAnalyticsEvents,
  getDailyAnalytics,
} = require('../controllers/analyticsController');
const { protectTherapist } = require('../middleware/auth');

// ─── Admin Dashboard Analytics (Platform-wide) ───────────────────
// Exposes platform-wide daily aggregates, practitioner breakdown, and activity
router.get('/', getAdminAnalytics);
router.get('/admin', getAdminAnalytics);

// ─── Therapist Practice Analytics ────────────────────────────────
// Protected routes for authenticated practitioners
router.get('/overview', protectTherapist, getAnalyticsOverview);
router.get('/events', protectTherapist, getAnalyticsEvents);
router.get('/daily', protectTherapist, getDailyAnalytics);

module.exports = router;
