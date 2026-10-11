const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Therapist = require('../models/Therapist');
const { emitAnalytics } = require('../utils/analytics');

/**
 * Helper to ensure a therapist has standard packages (3, 6, 12 sessions)
 */
const ensureDefaultPackages = async (therapist) => {
  const existingCount = await Package.countDocuments({ therapistId: therapist._id });
  if (existingCount > 0) return;

  const basePriceInr = therapist.pricing?.individualSession || 1500;

  const defaultTemplates = [
    {
      title: 'Therapy Starter Package',
      sessionCount: 3,
      discountPercent: 10,
      pricePaise: Math.round(basePriceInr * 3 * 0.9 * 100),
      perSessionPricePaise: Math.round(basePriceInr * 0.9 * 100),
      validityDays: 60,
      description: 'Ideal for tackling specific situational stressors and developing initial coping strategies.',
    },
    {
      title: 'Deep Healing Package',
      sessionCount: 6,
      discountPercent: 15,
      pricePaise: Math.round(basePriceInr * 6 * 0.85 * 100),
      perSessionPricePaise: Math.round(basePriceInr * 0.85 * 100),
      validityDays: 120,
      description: 'Comprehensive course for sustained progress, emotional regulation, and cognitive restructuring.',
    },
    {
      title: 'Long-term Transformation',
      sessionCount: 12,
      discountPercent: 20,
      pricePaise: Math.round(basePriceInr * 12 * 0.8 * 100),
      perSessionPricePaise: Math.round(basePriceInr * 0.8 * 100),
      validityDays: 240,
      description: 'In-depth therapeutic journey for trauma resolution, deep relationship patterns, and self-actualization.',
    },
  ];

  for (const t of defaultTemplates) {
    await Package.create({
      therapistId: therapist._id,
      ...t,
      isActive: true,
    });
  }
};

/**
 * @desc    Get public active packages for a therapist's public website
 * @route   GET /api/packages/public/:slug
 * @access  Public
 */
const getPublicPackages = async (req, res) => {
  try {
    const { slug } = req.params;
    const therapist = await Therapist.findOne({ slug: slug.toLowerCase().trim() });
    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist not found.',
      });
    }

    // Ensure packages are ready
    await ensureDefaultPackages(therapist);

    const packages = await Package.find({
      therapistId: therapist._id,
      isActive: true,
    }).sort({ sessionCount: 1 });

    return res.status(200).json({
      status: 'success',
      data: {
        packages,
        therapist: {
          name: therapist.name,
          slug: therapist.slug,
          currency: 'INR',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching public packages:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve packages.',
    });
  }
};

/**
 * @desc    Get packages for therapist dashboard
 * @route   GET /api/packages
 * @access  Private (Therapist)
 */
const getTherapistPackages = async (req, res) => {
  try {
    const therapist = req.therapist;
    await ensureDefaultPackages(therapist);

    const packages = await Package.find({ therapistId: therapist._id }).sort({ sessionCount: 1 });

    return res.status(200).json({
      status: 'success',
      data: { packages },
    });
  } catch (error) {
    console.error('Error fetching therapist packages:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve packages.',
    });
  }
};

/**
 * @desc    Create a custom package
 * @route   POST /api/packages
 * @access  Private (Therapist)
 */
const createPackage = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const {
      title,
      sessionCount,
      priceInr,
      discountPercent = 0,
      validityDays = 90,
      description = '',
    } = req.body;

    if (!title || !sessionCount || !priceInr) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, sessionCount, and price are required.',
      });
    }

    const pricePaise = Math.round(Number(priceInr) * 100);
    const perSessionPricePaise = Math.round(pricePaise / Number(sessionCount));

    const pkg = await Package.create({
      therapistId,
      title: title.trim(),
      sessionCount: Number(sessionCount),
      pricePaise,
      perSessionPricePaise,
      discountPercent: Number(discountPercent),
      validityDays: Number(validityDays),
      description: description.trim(),
      isActive: true,
    });

    // ─── Module 7: Increment subscription package usage counter ─────
    try {
      if (req._entitlement && req._entitlement.subscription) {
        const Subscription = require('../models/Subscription');
        await Subscription.findByIdAndUpdate(
          req._entitlement.subscription._id,
          { $inc: { packagesUsed: 1 } }
        );
      }
    } catch (usageErr) {
      console.warn('Package usage counter increment warning:', usageErr.message);
    }

    // Module 7: Emit package creation analytics
    emitAnalytics('package', 'package_created', therapistId, req._entitlement?.tier || 'starter', {
      packageId: pkg._id,
      sessionCount: pkg.sessionCount,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Package created successfully.',
      data: { package: pkg },
    });
  } catch (error) {
    console.error('Error creating package:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create package.',
    });
  }
};

/**
 * @desc    Get client packages & session credit balances
 * @route   GET /api/packages/client/:clientId
 * @access  Private (Therapist)
 */
const getClientPackages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const therapistId = req.therapist._id;

    const clientPackages = await ClientPackage.find({
      therapistId,
      clientId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: { clientPackages },
    });
  } catch (error) {
    console.error('Error fetching client packages:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve client packages.',
    });
  }
};

module.exports = {
  getPublicPackages,
  getTherapistPackages,
  createPackage,
  getClientPackages,
};
