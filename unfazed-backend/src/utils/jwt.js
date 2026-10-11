const jwt = require('jsonwebtoken');

/**
 * Signs a JWT token containing the therapist's ID.
 */
const generateToken = (therapistId) => {
  return jwt.sign(
    { id: therapistId, role: 'therapist' },
    process.env.JWT_SECRET || 'unfazed_dev_secret_fallback',
    { expiresIn: '30d' }
  );
};

module.exports = {
  generateToken,
};
