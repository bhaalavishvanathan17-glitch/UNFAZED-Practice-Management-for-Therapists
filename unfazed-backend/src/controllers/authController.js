const Therapist = require('../models/Therapist');
const { generateToken } = require('../utils/jwt');
const { generateUniqueSlug } = require('../utils/slugify');

/**
 * @desc    Register a new therapist
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerTherapist = async (req, res) => {
  try {
    const { name, email, password, headline, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters.',
      });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existingTherapist = await Therapist.findOne({ email: emailNormalized });
    if (existingTherapist) {
      return res.status(400).json({
        status: 'error',
        message: 'A therapist with this email address already exists.',
      });
    }

    // Generate unique slug from the therapist's name
    const slug = await generateUniqueSlug(name);

    const therapist = await Therapist.create({
      name: name.trim(),
      email: emailNormalized,
      password,
      slug,
      headline: headline || 'Licensed Clinical Psychologist & Counselor',
      city: city || 'New Delhi, India',
    });

    const token = generateToken(therapist._id);

    return res.status(201).json({
      status: 'success',
      message: 'Therapist registered successfully',
      data: {
        therapist: therapist.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during registration',
    });
  }
};

/**
 * @desc    Authenticate therapist & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginTherapist = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
      });
    }

    const emailNormalized = email.toLowerCase().trim();
    // Include password field since it has select: false by default
    const therapist = await Therapist.findOne({ email: emailNormalized }).select('+password');

    if (!therapist) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await therapist.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    if (!therapist.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is deactivated. Please contact support.',
      });
    }

    const token = generateToken(therapist._id);

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        therapist: therapist.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during login',
    });
  }
};

/**
 * @desc    Get currently logged in therapist's profile
 * @route   GET /api/auth/me
 * @access  Private (Therapist)
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        therapist: req.therapist.toSafeObject ? req.therapist.toSafeObject() : req.therapist,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching profile',
    });
  }
};

module.exports = {
  registerTherapist,
  loginTherapist,
  getMe,
};
