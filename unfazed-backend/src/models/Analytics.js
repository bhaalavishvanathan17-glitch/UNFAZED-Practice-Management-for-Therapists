const mongoose = require('mongoose');

/**
 * AnalyticsEvent model — stores individual analytics events for
 * aggregation, dashboards, and audit trails.
 *
 * Events are categorized by `category` (subscription, session, package, feature)
 * and typed by `action` (e.g. 'created', 'upgraded', 'quota_exceeded').
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['subscription', 'session', 'package', 'feature', 'entitlement', 'system'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      // e.g. 'created', 'upgraded', 'cancelled', 'renewed',
      //      'session_booked', 'quota_exceeded', 'feature_gated'
    },
    tier: {
      type: String,
      enum: ['starter', 'professional', 'clinic'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient dashboard queries
analyticsEventSchema.index({ category: 1, action: 1, createdAt: -1 });
analyticsEventSchema.index({ therapistId: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });

/**
 * DailyAggregate model — pre-computed daily rollups for fast
 * dashboard rendering without scanning the full event log.
 */
const dailyAggregateSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      index: true,
    },
    tier: {
      type: String,
      enum: ['starter', 'professional', 'clinic'],
    },
    counts: {
      sessionsBooked: { type: Number, default: 0 },
      sessionsCancelled: { type: Number, default: 0 },
      sessionsCompleted: { type: Number, default: 0 },
      packagesCreated: { type: Number, default: 0 },
      subscriptionsCreated: { type: Number, default: 0 },
      subscriptionsUpgraded: { type: Number, default: 0 },
      subscriptionsCancelled: { type: Number, default: 0 },
      quotaExceeded: { type: Number, default: 0 },
      featureGated: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// One aggregate row per therapist per day
dailyAggregateSchema.index({ date: 1, therapistId: 1 }, { unique: true });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
const DailyAggregate = mongoose.model('DailyAggregate', dailyAggregateSchema);

module.exports = { AnalyticsEvent, DailyAggregate };
