const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');

/**
 * Protects routes requiring therapist authentication.
 * Checks for `Authorization: Bearer <token>` in header.
 */
const protectTherapist = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized. Please log in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'unfazed_dev_secret_fallback');
    const therapist = await Therapist.findById(decoded.id).select('-password');

    if (!therapist || !therapist.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Therapist account not found or has been deactivated.',
      });
    }

    req.therapist = therapist;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Token verification failed. Please log in again.',
    });
  }
};

module.exports = {
  protectTherapist,
};
