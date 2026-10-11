const express = require('express');
const router = express.Router();
const {
  getMyAvailability,
  updateMyAvailability,
  getPublicAvailableSlots,
  bookSession,
  getMySessions,
  updateSessionStatus,
} = require('../controllers/schedulingController');
const { protectTherapist } = require('../middleware/auth');
const { checkSessionEntitlement } = require('../middleware/entitlement');

// ─── Availability Routes ──────────────────────────────────────────
// Therapist availability template management
router.get('/availability/me', protectTherapist, getMyAvailability);
router.put('/availability/me', protectTherapist, updateMyAvailability);

// Public bookable slot calculation for client calendar
router.get('/availability/slots/:slug', getPublicAvailableSlots);

// ─── Session Booking Routes ───────────────────────────────────────
// Client booking endpoint (Entitlement check → Strict conflict checks)
router.post('/sessions/book', checkSessionEntitlement, bookSession);

// Therapist appointments & calendar feed
router.get('/sessions/me', protectTherapist, getMySessions);
router.patch('/sessions/:id/status', protectTherapist, updateSessionStatus);

module.exports = router;
