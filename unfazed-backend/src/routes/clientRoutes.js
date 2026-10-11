const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  submitIntake,
} = require('../controllers/clientController');
const { protectTherapist } = require('../middleware/auth');

// Therapist CRM operations (Strictly scoped to logged in therapist)
router.get('/', protectTherapist, getClients);
router.post('/', protectTherapist, createClient);
router.get('/:id', protectTherapist, getClientById);
router.put('/:id', protectTherapist, updateClient);

// Client intake form submission
router.post('/:id/intake', submitIntake);

module.exports = router;
