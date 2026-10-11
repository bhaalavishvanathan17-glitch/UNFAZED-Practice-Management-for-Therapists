const Therapist = require('../models/Therapist');
const { generateUniqueSlug } = require('../utils/slugify');

/**
 * @desc    Get public therapist profile by unique slug
 * @route   GET /api/therapists/public/:slug
 * @access  Public
 */
const getPublicTherapistProfile = async (req, res) => {
  try {
    const { slug } = req.params;

    const therapist = await Therapist.findOne({
      slug: slug.toLowerCase().trim(),
      isActive: true,
    }).select('-password');

    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist profile not found or inactive.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        therapist: therapist.toSafeObject(),
      },
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve therapist profile.',
    });
  }
};

/**
 * @desc    Update authenticated therapist's profile
 * @route   PUT /api/therapists/profile
 * @access  Private (Therapist)
 */
const updateProfile = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const {
      name,
      headline,
      bio,
      specializations,
      languages,
      experienceYears,
      qualifications,
      city,
      contactPhone,
      avatarUrl,
      customSlug,
      services,
    } = req.body;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist account not found.',
      });
    }

    // Handle slug change if requested
    if (customSlug && customSlug.trim() !== therapist.slug) {
      const sanitizedSlug = await generateUniqueSlug(customSlug.trim(), therapistId);
      therapist.slug = sanitizedSlug;
    }

    if (name) therapist.name = name.trim();
    if (headline !== undefined) therapist.headline = headline.trim();
    if (bio !== undefined) therapist.bio = bio;
    if (Array.isArray(specializations)) therapist.specializations = specializations;
    if (Array.isArray(languages)) therapist.languages = languages;
    if (experienceYears !== undefined) therapist.experienceYears = Number(experienceYears);
    if (Array.isArray(qualifications)) therapist.qualifications = qualifications;
    if (city !== undefined) therapist.city = city.trim();
    if (contactPhone !== undefined) therapist.contactPhone = contactPhone.trim();
    if (avatarUrl !== undefined) therapist.avatarUrl = avatarUrl;
    if (Array.isArray(services)) therapist.services = services;

    await therapist.save();

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        therapist: therapist.toSafeObject(),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update therapist profile.',
    });
  }
};

module.exports = {
  getPublicTherapistProfile,
  updateProfile,
};
