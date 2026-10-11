/**
 * entitlement.js — Subscription Entitlement Middleware
 *
 * Central gate-keeper that validates a therapist's subscription quota
 * before allowing resource creation (sessions, packages, etc.).
 *
 * Usage:
 *   router.post('/sessions/book', checkSessionEntitlement, bookSession);
 *   router.post('/', protectTherapist, checkPackageEntitlement, createPackage);
 *   router.post('/notes', protectTherapist, requireFeature('clinicalNotes'), createNote);
 */

const Subscription = require('../models/Subscription');
const Therapist = require('../models/Therapist');
const { emitAnalytics } = require('../utils/analytics');

// ─── Tier Limits Configuration ────────────────────────────────────
// These caps define the maximum allowed resources per billing period.
// 0 means unlimited (no cap).
const TIER_LIMITS = {
  starter: {
    sessionsPerMonth: 30,
    maxActivePackages: 3,
    maxClients: 25,
    features: {
      clinicalNotes: true,
      videoSessions: true,
      customBranding: false,
      bulkMessaging: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  professional: {
    sessionsPerMonth: 150,
    maxActivePackages: 15,
    maxClients: 100,
    features: {
      clinicalNotes: true,
      videoSessions: true,
      customBranding: true,
      bulkMessaging: true,
      advancedAnalytics: false,
      prioritySupport: true,
    },
  },
  clinic: {
    sessionsPerMonth: 0, // unlimited
    maxActivePackages: 0, // unlimited
    maxClients: 0,        // unlimited
    features: {
      clinicalNotes: true,
      videoSessions: true,
      customBranding: true,
      bulkMessaging: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  },
};

/**
 * Helper – resolves the active subscription for a therapist.
 * Looks up via the therapist's `subscription` ObjectId ref first,
 * then falls back to the latest active subscription document.
 */
const resolveSubscription = async (therapistId, subscriptionRef) => {
  if (subscriptionRef) {
    const sub = await Subscription.findById(subscriptionRef);
    if (sub && (!sub.endDate || sub.endDate > new Date())) {
      return sub;
    }
  }

  // Fallback: find the most recent non-expired subscription
  return Subscription.findOne({
    therapistId,
    $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });
};

/**
 * @middleware checkSessionEntitlement
 * Ensures the therapist hasn't exceeded their monthly session quota.
 *
 * Works for both:
 *  - Authenticated therapist routes (req.therapist populated by protectTherapist)
 *  - Public booking routes (therapist resolved from req.body.therapistSlug)
 */
const checkSessionEntitlement = async (req, res, next) => {
  try {
    let therapist = req.therapist;

    // For public booking routes, resolve therapist from slug
    if (!therapist && req.body.therapistSlug) {
      therapist = await Therapist.findOne({
        slug: req.body.therapistSlug,
        isActive: true,
      });
    }

    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist not found.',
      });
    }

    const tier = therapist.subscriptionTier || 'starter';
    const limits = TIER_LIMITS[tier];

    // If tier has unlimited sessions, skip the check
    if (limits.sessionsPerMonth === 0) {
      req._entitlement = { tier, limits, unlimited: true };
      return next();
    }

    const subscription = await resolveSubscription(therapist._id, therapist.subscription);

    const sessionsUsed = subscription ? subscription.sessionsUsed : 0;

    if (sessionsUsed >= limits.sessionsPerMonth) {
      emitAnalytics('entitlement', 'quota_exceeded', therapist._id, tier, {
        resource: 'session',
        limit: limits.sessionsPerMonth,
        used: sessionsUsed,
      });

      return res.status(403).json({
        status: 'error',
        code: 'SESSION_QUOTA_EXCEEDED',
        message: `Your "${tier}" plan allows ${limits.sessionsPerMonth} sessions per month. You have used ${sessionsUsed}. Please upgrade your subscription.`,
        data: {
          tier,
          limit: limits.sessionsPerMonth,
          used: sessionsUsed,
          upgradeRequired: true,
        },
      });
    }

    // Attach entitlement context for downstream handlers
    req._entitlement = {
      tier,
      limits,
      subscription,
      sessionsUsed,
      sessionsRemaining: limits.sessionsPerMonth - sessionsUsed,
    };

    next();
  } catch (error) {
    console.error('Entitlement check error (session):', error.message);
    // Fail open in case of DB errors – don't block bookings
    next();
  }
};

/**
 * @middleware checkPackageEntitlement
 * Ensures the therapist hasn't exceeded their package creation limit.
 * Must be placed AFTER protectTherapist in the middleware chain.
 */
const checkPackageEntitlement = async (req, res, next) => {
  try {
    const therapist = req.therapist;

    if (!therapist) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
    }

    const tier = therapist.subscriptionTier || 'starter';
    const limits = TIER_LIMITS[tier];

    // If tier has unlimited packages, skip the check
    if (limits.maxActivePackages === 0) {
      req._entitlement = { tier, limits, unlimited: true };
      return next();
    }

    const subscription = await resolveSubscription(therapist._id, therapist.subscription);

    const packagesUsed = subscription ? subscription.packagesUsed : 0;

    if (packagesUsed >= limits.maxActivePackages) {
      emitAnalytics('entitlement', 'quota_exceeded', therapist._id, tier, {
        resource: 'package',
        limit: limits.maxActivePackages,
        used: packagesUsed,
      });

      return res.status(403).json({
        status: 'error',
        code: 'PACKAGE_QUOTA_EXCEEDED',
        message: `Your "${tier}" plan allows ${limits.maxActivePackages} active packages. You have ${packagesUsed}. Please upgrade your subscription.`,
        data: {
          tier,
          limit: limits.maxActivePackages,
          used: packagesUsed,
          upgradeRequired: true,
        },
      });
    }

    req._entitlement = {
      tier,
      limits,
      subscription,
      packagesUsed,
      packagesRemaining: limits.maxActivePackages - packagesUsed,
    };

    next();
  } catch (error) {
    console.error('Entitlement check error (package):', error.message);
    // Fail open
    next();
  }
};

/**
 * @middleware requireFeature(featureName)
 * Factory that returns middleware gating access to a specific feature flag.
 *
 * Usage:
 *   router.post('/bulk-message', protectTherapist, requireFeature('bulkMessaging'), handler);
 */
const requireFeature = (featureName) => {
  return (req, res, next) => {
    try {
      const therapist = req.therapist;

      if (!therapist) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required.',
        });
      }

      const tier = therapist.subscriptionTier || 'starter';
      const limits = TIER_LIMITS[tier];

      if (!limits.features[featureName]) {
        emitAnalytics('entitlement', 'feature_gated', therapist._id, tier, {
          feature: featureName,
        });

        return res.status(403).json({
          status: 'error',
          code: 'FEATURE_NOT_AVAILABLE',
          message: `The "${featureName}" feature is not available on the "${tier}" plan. Please upgrade to access this feature.`,
          data: {
            tier,
            feature: featureName,
            upgradeRequired: true,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate error:', error.message);
      next();
    }
  };
};

module.exports = {
  TIER_LIMITS,
  checkSessionEntitlement,
  checkPackageEntitlement,
  requireFeature,
  resolveSubscription,
};
