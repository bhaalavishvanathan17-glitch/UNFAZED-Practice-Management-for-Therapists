const express = require('express');
const router = express.Router();
const { registerTherapist, loginTherapist, getMe } = require('../controllers/authController');
const { protectTherapist } = require('../middleware/auth');

router.post('/register', registerTherapist);
router.post('/login', loginTherapist);
router.get('/me', protectTherapist, getMe);

module.exports = router;
