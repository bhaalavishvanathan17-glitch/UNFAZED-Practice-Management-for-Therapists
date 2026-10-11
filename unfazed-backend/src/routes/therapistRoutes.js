const express = require('express');
const router = express.Router();
const { getPublicTherapistProfile, updateProfile } = require('../controllers/therapistController');
const { protectTherapist } = require('../middleware/auth');

// Public route to view therapist profile by slug (e.g. /api/therapists/public/dr-ananya-sharma)
router.get('/public/:slug', getPublicTherapistProfile);

// Authenticated route for therapist to update their practice profile
router.put('/profile', protectTherapist, updateProfile);

module.exports = router;
