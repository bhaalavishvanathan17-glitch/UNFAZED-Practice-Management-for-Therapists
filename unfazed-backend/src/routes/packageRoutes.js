const express = require('express');
const router = express.Router();
const {
  getPublicPackages,
  getTherapistPackages,
  createPackage,
  getClientPackages,
} = require('../controllers/packageController');
const { protectTherapist } = require('../middleware/auth');
const { checkPackageEntitlement } = require('../middleware/entitlement');

// Public route for client discovery on therapist's branded page
router.get('/public/:slug', getPublicPackages);

// Protected routes for therapist management
router.get('/', protectTherapist, getTherapistPackages);
router.post('/', protectTherapist, checkPackageEntitlement, createPackage);
router.get('/client/:clientId', protectTherapist, getClientPackages);

module.exports = router;
