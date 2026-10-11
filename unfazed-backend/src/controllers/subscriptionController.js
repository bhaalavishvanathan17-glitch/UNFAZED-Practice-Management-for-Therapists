/**
 * subscriptionController.js — Subscription CRUD & Lifecycle Management
 *
 * Handles creating, reading, upgrading, renewing, and cancelling
 * therapist subscriptions. Each mutation keeps the parent Therapist
 * document's `subscriptionTier` and quota fields in sync.
 */

const Subscription = require('../models/Subscription');
const Therapist = require('../models/Therapist');
const { TIER_LIMITS } = require('../middleware/entitlement');
const { emitAnalytics } = require('../utils/analytics');

// ─── Tier pricing (paise) — used for upgrade proration display ────
const TIER_PRICING = {
  starter:      { monthlyPaise: 0,        label: 'Free' },
  professional: { monthlyPaise: 199900,   label: '₹1,999/mo' },
  clinic:       { monthlyPaise: 499900,   label: '₹4,999/mo' },
};

/**
 * Helper – sync Therapist document after subscription mutation.
 */
const syncTherapistTier = async (therapistId, tier, subscriptionId) => {
  const limits = TIER_LIMITS[tier];
  await Therapist.findByIdAndUpdate(therapistId, {
    subscriptionTier: tier,
    subscription: subscriptionId,
    sessionQuota: limits.sessionsPerMonth,
    packageQuota: limits.maxActivePackages,
  });
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/subscriptions/me
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Get the authenticated therapist's current subscription + tier info
 * @route   GET /api/subscriptions/me
 * @access  Private (Therapist)
 */
const getMySubscription = async (req, res) => {
  try {
    const therapist = req.therapist;

    // Find the active (non-expired) subscription
    const subscription = await Subscription.findOne({
      therapistId: therapist._id,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    }).sort({ createdAt: -1 });

    const tier = subscription ? subscription.tier : (therapist.subscriptionTier || 'starter');
    const limits = TIER_LIMITS[tier];
    const pricing = TIER_PRICING[tier];

    return res.status(200).json({
      status: 'success',
      data: {
        subscription: subscription || null,
        tier,
        limits,
        pricing,
        usage: subscription
          ? {
              sessionsUsed: subscription.sessionsUsed,
              packagesUsed: subscription.packagesUsed,
              sessionsRemaining: limits.sessionsPerMonth === 0
                ? 'unlimited'
                : limits.sessionsPerMonth - subscription.sessionsUsed,
              packagesRemaining: limits.maxActivePackages === 0
                ? 'unlimited'
                : limits.maxActivePackages - subscription.packagesUsed,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve subscription details.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/subscriptions/plans
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    List all available subscription plans with limits & pricing
 * @route   GET /api/subscriptions/plans
 * @access  Public
 */
const getAvailablePlans = async (req, res) => {
  try {
    const plans = Object.entries(TIER_LIMITS).map(([tier, limits]) => ({
      tier,
      ...limits,
      pricing: TIER_PRICING[tier],
    }));

    return res.status(200).json({
      status: 'success',
      data: { plans },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve plans.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// POST /api/subscriptions
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Create a new subscription for the authenticated therapist
 * @route   POST /api/subscriptions
 * @access  Private (Therapist)
 */
const createSubscription = async (req, res) => {
  try {
    const therapist = req.therapist;
    const { tier = 'starter' } = req.body;

    if (!TIER_LIMITS[tier]) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid tier "${tier}". Valid tiers: starter, professional, clinic.`,
      });
    }

    // Check for an existing active subscription
    const existing = await Subscription.findOne({
      therapistId: therapist._id,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        code: 'SUBSCRIPTION_EXISTS',
        message: `You already have an active "${existing.tier}" subscription. Use the upgrade endpoint to change tiers.`,
        data: { currentTier: existing.tier, subscriptionId: existing._id },
      });
    }

    // Build initial feature flags from tier config
    const featureMap = {};
    for (const [key, val] of Object.entries(TIER_LIMITS[tier].features)) {
      featureMap[key] = val;
    }

    const subscription = await Subscription.create({
      therapistId: therapist._id,
      tier,
      startDate: new Date(),
      endDate: null, // ongoing until cancelled
      sessionsUsed: 0,
      packagesUsed: 0,
      features: featureMap,
    });

    // Sync therapist document
    await syncTherapistTier(therapist._id, tier, subscription._id);

    emitAnalytics('subscription', 'subscription_created', therapist._id, tier, {
      subscriptionId: subscription._id,
    });

    return res.status(201).json({
      status: 'success',
      message: `Subscription created on the "${tier}" plan.`,
      data: {
        subscription,
        limits: TIER_LIMITS[tier],
        pricing: TIER_PRICING[tier],
      },
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create subscription.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// PUT /api/subscriptions/upgrade
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Upgrade (or downgrade) the therapist's subscription tier
 * @route   PUT /api/subscriptions/upgrade
 * @access  Private (Therapist)
 */
const upgradeSubscription = async (req, res) => {
  try {
    const therapist = req.therapist;
    const newTier = req.body.newTier || req.body.tier;

    if (!newTier || !TIER_LIMITS[newTier]) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid tier "${newTier}". Valid tiers: starter, professional, clinic.`,
      });
    }

    // Find the current active subscription
    let subscription = await Subscription.findOne({
      therapistId: therapist._id,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    }).sort({ createdAt: -1 });

    if (!subscription) {
      // Auto-create if none exists (graceful upgrade path)
      const featureMap = {};
      for (const [key, val] of Object.entries(TIER_LIMITS[newTier].features)) {
        featureMap[key] = val;
      }

      subscription = await Subscription.create({
        therapistId: therapist._id,
        tier: newTier,
        startDate: new Date(),
        sessionsUsed: 0,
        packagesUsed: 0,
        features: featureMap,
      });

      await syncTherapistTier(therapist._id, newTier, subscription._id);

      emitAnalytics('subscription', 'subscription_created', therapist._id, newTier, {
        subscriptionId: subscription._id,
        via: 'upgrade_auto_create',
      });

      return res.status(201).json({
        status: 'success',
        message: `Subscription created on the "${newTier}" plan.`,
        data: {
          subscription,
          previousTier: null,
          newTier,
          limits: TIER_LIMITS[newTier],
        },
      });
    }

    const previousTier = subscription.tier;

    if (previousTier === newTier) {
      return res.status(400).json({
        status: 'error',
        message: `You are already on the "${newTier}" plan.`,
      });
    }

    // Determine direction
    const tierOrder = ['starter', 'professional', 'clinic'];
    const oldIdx = tierOrder.indexOf(previousTier);
    const newIdx = tierOrder.indexOf(newTier);
    const isUpgrade = newIdx > oldIdx;

    // Update the subscription document
    subscription.tier = newTier;

    // Rebuild feature flags for new tier
    const featureMap = {};
    for (const [key, val] of Object.entries(TIER_LIMITS[newTier].features)) {
      featureMap[key] = val;
    }
    subscription.features = featureMap;

    // On upgrade: keep existing usage counters (they've already earned them)
    // On downgrade: cap usage to new limits if they already exceed
    if (!isUpgrade) {
      const newLimits = TIER_LIMITS[newTier];
      if (newLimits.sessionsPerMonth > 0 && subscription.sessionsUsed > newLimits.sessionsPerMonth) {
        subscription.sessionsUsed = newLimits.sessionsPerMonth;
      }
      if (newLimits.maxActivePackages > 0 && subscription.packagesUsed > newLimits.maxActivePackages) {
        subscription.packagesUsed = newLimits.maxActivePackages;
      }
    }

    await subscription.save();

    // Sync therapist document
    await syncTherapistTier(therapist._id, newTier, subscription._id);

    const direction = isUpgrade ? 'upgrade' : 'downgrade';
    emitAnalytics('subscription', isUpgrade ? 'subscription_upgraded' : 'subscription_downgraded', therapist._id, newTier, {
      subscriptionId: subscription._id,
      previousTier,
      newTier,
    });

    return res.status(200).json({
      status: 'success',
      message: isUpgrade
        ? `Successfully upgraded from "${previousTier}" to "${newTier}".`
        : `Plan changed from "${previousTier}" to "${newTier}".`,
      data: {
        subscription,
        previousTier,
        newTier,
        direction: isUpgrade ? 'upgrade' : 'downgrade',
        limits: TIER_LIMITS[newTier],
        pricing: TIER_PRICING[newTier],
      },
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upgrade subscription.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// PUT /api/subscriptions/cancel
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Cancel the therapist's active subscription
 * @route   PUT /api/subscriptions/cancel
 * @access  Private (Therapist)
 */
const cancelSubscription = async (req, res) => {
  try {
    const therapist = req.therapist;
    const { reason = '' } = req.body;

    const subscription = await Subscription.findOne({
      therapistId: therapist._id,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'No active subscription found to cancel.',
      });
    }

    const cancelledTier = subscription.tier;

    // End the subscription immediately
    subscription.endDate = new Date();
    await subscription.save();

    // Revert therapist to starter tier
    await syncTherapistTier(therapist._id, 'starter', null);

    emitAnalytics('subscription', 'subscription_cancelled', therapist._id, cancelledTier, {
      subscriptionId: subscription._id,
      reason,
    });

    return res.status(200).json({
      status: 'success',
      message: `Your "${cancelledTier}" subscription has been cancelled. You are now on the "starter" plan.`,
      data: {
        cancelledSubscription: subscription,
        cancelledTier,
        currentTier: 'starter',
        reason,
        limits: TIER_LIMITS.starter,
      },
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to cancel subscription.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// PUT /api/subscriptions/renew
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Renew the subscription — resets usage counters for a new billing period
 * @route   PUT /api/subscriptions/renew
 * @access  Private (Therapist)
 */
const renewSubscription = async (req, res) => {
  try {
    const therapist = req.therapist;

    let subscription = await Subscription.findOne({
      therapistId: therapist._id,
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        status: 'error',
        message: 'No subscription record found. Please create one first.',
      });
    }

    const tier = subscription.tier;

    // Reset usage counters and extend the subscription
    subscription.sessionsUsed = 0;
    subscription.packagesUsed = 0;
    subscription.startDate = new Date();
    subscription.endDate = null; // ongoing again

    await subscription.save();

    // Re-sync therapist
    await syncTherapistTier(therapist._id, tier, subscription._id);

    emitAnalytics('subscription', 'subscription_renewed', therapist._id, tier, {
      subscriptionId: subscription._id,
    });

    return res.status(200).json({
      status: 'success',
      message: `Subscription renewed on the "${tier}" plan. Usage counters have been reset.`,
      data: {
        subscription,
        tier,
        limits: TIER_LIMITS[tier],
        pricing: TIER_PRICING[tier],
      },
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to renew subscription.',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/subscriptions/usage
// ═══════════════════════════════════════════════════════════════════

/**
 * @desc    Get detailed usage stats for the current billing period
 * @route   GET /api/subscriptions/usage
 * @access  Private (Therapist)
 */
const getUsageStats = async (req, res) => {
  try {
    const therapist = req.therapist;
    const Session = require('../models/Session');
    const Package = require('../models/Package');
    const Client = require('../models/Client');

    const subscription = await Subscription.findOne({
      therapistId: therapist._id,
      $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    }).sort({ createdAt: -1 });

    const tier = subscription ? subscription.tier : (therapist.subscriptionTier || 'starter');
    const limits = TIER_LIMITS[tier];

    // Compute real-time counts from source data
    const periodStart = subscription ? subscription.startDate : therapist.createdAt;

    const [sessionCount, packageCount, clientCount] = await Promise.all([
      Session.countDocuments({
        therapistId: therapist._id,
        status: { $in: ['confirmed', 'completed'] },
        createdAt: { $gte: periodStart },
      }),
      Package.countDocuments({
        therapistId: therapist._id,
        isActive: true,
      }),
      Client.countDocuments({
        therapistId: therapist._id,
      }),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        tier,
        periodStart,
        usage: {
          sessions: {
            used: sessionCount,
            limit: limits.sessionsPerMonth || 'unlimited',
            remaining: limits.sessionsPerMonth === 0
              ? 'unlimited'
              : Math.max(0, limits.sessionsPerMonth - sessionCount),
            percentUsed: limits.sessionsPerMonth === 0
              ? 0
              : Math.round((sessionCount / limits.sessionsPerMonth) * 100),
          },
          packages: {
            used: packageCount,
            limit: limits.maxActivePackages || 'unlimited',
            remaining: limits.maxActivePackages === 0
              ? 'unlimited'
              : Math.max(0, limits.maxActivePackages - packageCount),
            percentUsed: limits.maxActivePackages === 0
              ? 0
              : Math.round((packageCount / limits.maxActivePackages) * 100),
          },
          clients: {
            used: clientCount,
            limit: limits.maxClients || 'unlimited',
            remaining: limits.maxClients === 0
              ? 'unlimited'
              : Math.max(0, limits.maxClients - clientCount),
            percentUsed: limits.maxClients === 0
              ? 0
              : Math.round((clientCount / limits.maxClients) * 100),
          },
        },
        features: limits.features,
      },
    });
  } catch (error) {
    console.error('Error computing usage stats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to compute usage statistics.',
    });
  }
};

module.exports = {
  getMySubscription,
  getAvailablePlans,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription,
  getUsageStats,
};
