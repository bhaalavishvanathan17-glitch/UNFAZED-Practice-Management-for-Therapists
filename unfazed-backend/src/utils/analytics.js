/**
 * analytics.js — Analytics Event Emitter
 *
 * Singleton EventEmitter that decouples analytics tracking from
 * business logic. Controllers and middleware emit events; this
 * module persists them to MongoDB and updates daily aggregates.
 *
 * Usage:
 *   const { emitAnalytics } = require('../utils/analytics');
 *   emitAnalytics('subscription', 'created', therapistId, 'professional', { ... });
 *
 * External integrations (Segment, Mixpanel, etc.) can be added
 * by registering additional listeners on the shared emitter.
 */

const EventEmitter = require('events');
const { AnalyticsEvent, DailyAggregate } = require('../models/Analytics');

// ─── Shared singleton emitter ────────────────────────────────────
const analyticsEmitter = new EventEmitter();
analyticsEmitter.setMaxListeners(50); // allow many listeners

// ─── Today's date string helper ──────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ─── Map action → aggregate counter field ────────────────────────
const ACTION_TO_COUNTER = {
  session_booked:          'counts.sessionsBooked',
  session_cancelled:       'counts.sessionsCancelled',
  session_completed:       'counts.sessionsCompleted',
  package_created:         'counts.packagesCreated',
  subscription_created:    'counts.subscriptionsCreated',
  subscription_upgraded:   'counts.subscriptionsUpgraded',
  subscription_downgraded: 'counts.subscriptionsUpgraded', // treat same counter
  subscription_cancelled:  'counts.subscriptionsCancelled',
  subscription_renewed:    'counts.subscriptionsCreated',   // renewal = new period
  quota_exceeded:          'counts.quotaExceeded',
  feature_gated:           'counts.featureGated',
};

// ─── Core listener — persist event + update daily aggregate ──────
analyticsEmitter.on('track', async ({ category, action, therapistId, tier, metadata }) => {
  try {
    // 1. Write the raw event
    await AnalyticsEvent.create({
      therapistId,
      category,
      action,
      tier,
      metadata,
    });

    // 2. Upsert the daily aggregate counter
    const counterField = ACTION_TO_COUNTER[action];
    if (counterField) {
      const today = todayStr();

      // 2a. Update therapist-specific daily aggregate
      if (therapistId) {
        await DailyAggregate.findOneAndUpdate(
          { date: today, therapistId },
          {
            $inc: { [counterField]: 1 },
            $setOnInsert: { tier },
          },
          { upsert: true }
        );
      }

      // 2b. Update platform-wide daily aggregate for admin dashboard (therapistId: null)
      await DailyAggregate.findOneAndUpdate(
        { date: today, therapistId: null },
        {
          $inc: { [counterField]: 1 },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    // Analytics should never crash the request pipeline
    console.warn('[Analytics] Persistence error:', err.message);
  }
});

// ─── Console logger (dev environment) ────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  analyticsEmitter.on('track', ({ category, action, therapistId, tier }) => {
    console.log(
      `  📊 [Analytics] ${category}.${action}  tier=${tier}  therapist=${therapistId}`
    );
  });
}

// ─── External adapter hook ───────────────────────────────────────
// Register a listener to forward events to external services.
// Example:
//   const { analyticsEmitter } = require('./utils/analytics');
//   analyticsEmitter.on('track', ({ category, action, metadata }) => {
//     segment.track({ event: `${category}.${action}`, properties: metadata });
//   });

// ─── Convenience function ────────────────────────────────────────

/**
 * Emit an analytics event.
 *
 * @param {string} category  - Event category (subscription|session|package|feature|entitlement|system)
 * @param {string} action    - Specific action (e.g. 'created', 'upgraded', 'quota_exceeded')
 * @param {string} therapistId - Therapist ObjectId
 * @param {string} tier      - Current subscription tier
 * @param {object} metadata  - Arbitrary payload (optional)
 */
const emitAnalytics = (category, action, therapistId, tier = 'starter', metadata = {}) => {
  analyticsEmitter.emit('track', {
    category,
    action,
    therapistId,
    tier,
    metadata,
  });
};

module.exports = {
  analyticsEmitter,
  emitAnalytics,
};
