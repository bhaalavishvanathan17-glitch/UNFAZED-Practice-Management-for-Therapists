const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotesByClient,
  getNoteById,
  updateNote,
  deleteNote,
  getClientPortalSharedNotes,
} = require('../controllers/noteController');
const { protectTherapist } = require('../middleware/auth');

// ─── CRITICAL ACCESS-CONTROL CLIENT PORTAL ROUTE ───────────────────
// Clients can ONLY access notes explicitly marked { visibility: 'shared' }
router.get('/portal/:clientId', getClientPortalSharedNotes);

// ─── PROTECTED THERAPIST CLINICAL NOTE ROUTES ──────────────────────
router.post('/', protectTherapist, createNote);
router.get('/client/:clientId', protectTherapist, getNotesByClient);
router.get('/:id', protectTherapist, getNoteById);
router.put('/:id', protectTherapist, updateNote);
router.delete('/:id', protectTherapist, deleteNote);

module.exports = router;
