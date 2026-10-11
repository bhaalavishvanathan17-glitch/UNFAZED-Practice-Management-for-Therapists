const { AnalyticsEvent, DailyAggregate } = require('../models/Analytics');
const Subscription = require('../models/Subscription');
const { TIER_LIMITS } = require('../middleware/entitlement');

/**
 * @desc    Get analytics overview for therapist dashboard
 * @route   GET /api/analytics/overview
 * @access  Private (Therapist)
 */
const getAnalyticsOverview = async (req, res) => {
  try {
    const therapistId = req.therapist._id;

    // 1. Get current subscription
    const subscription = await Subscription.findOne({
      therapistId,
      status: 'active',
    }).sort({ createdAt: -1 });

    const currentTier = subscription?.tier || req.therapist.subscriptionTier || 'starter';
    const tierLimits = TIER_LIMITS[currentTier] || TIER_LIMITS.starter;

    // 2. Aggregate last 30 days daily metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const aggregates = await DailyAggregate.find({
      therapistId,
      date: { $gte: startDateStr },
    }).sort({ date: 1 });

    // Calculate totals over last 30 days
    const totals = aggregates.reduce(
      (acc, day) => {
        acc.sessionsBooked += day.counts?.sessionsBooked || 0;
        acc.sessionsCancelled += day.counts?.sessionsCancelled || 0;
        acc.sessionsCompleted += day.counts?.sessionsCompleted || 0;
        acc.packagesCreated += day.counts?.packagesCreated || 0;
        acc.quotaExceeded += day.counts?.quotaExceeded || 0;
        acc.featureGated += day.counts?.featureGated || 0;
        return acc;
      },
      {
        sessionsBooked: 0,
        sessionsCancelled: 0,
        sessionsCompleted: 0,
        packagesCreated: 0,
        quotaExceeded: 0,
        featureGated: 0,
      }
    );

    // 3. Count total historical events
    const totalEvents = await AnalyticsEvent.countDocuments({ therapistId });

    return res.status(200).json({
      status: 'success',
      data: {
        tier: currentTier,
        tierLimits,
        subscription: subscription
          ? {
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              sessionsUsed: subscription.sessionsUsed,
              packagesUsed: subscription.packagesUsed,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null,
        last30Days: totals,
        totalEvents,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve analytics overview.',
    });
  }
};

/**
 * @desc    Get paginated raw analytics event log
 * @route   GET /api/analytics/events
 * @access  Private (Therapist)
 */
const getAnalyticsEvents = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { category, action, page = 1, limit = 20 } = req.query;

    const filter = { therapistId };
    if (category) filter.category = category;
    if (action) filter.action = action;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      AnalyticsEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AnalyticsEvent.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve analytics events.',
    });
  }
};

/**
 * @desc    Get daily time-series analytics aggregates
 * @route   GET /api/analytics/daily
 * @access  Private (Therapist)
 */
const getDailyAnalytics = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { days = 30 } = req.query;

    const daysCount = Math.min(90, Math.max(7, parseInt(days, 10) || 30));
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysCount);
    const startDateStr = pastDate.toISOString().slice(0, 10);

    const aggregates = await DailyAggregate.find({
      therapistId,
      date: { $gte: startDateStr },
    })
      .sort({ date: 1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      data: {
        aggregates,
        days: daysCount,
      },
    });
  } catch (error) {
    console.error('Error fetching daily analytics:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve daily analytics.',
    });
  }
};

/**
 * @desc    Get platform-wide analytics for admin dashboard
 * @route   GET /api/analytics
 * @access  Public / Admin
 */
const getAdminAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysCount = Math.min(90, Math.max(1, parseInt(days, 10) || 30));

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysCount);
    const startDateStr = pastDate.toISOString().slice(0, 10);

    const Therapist = require('../models/Therapist');

    // 1. Grouped daily aggregates across all therapists
    let dailyAggregates = await DailyAggregate.aggregate([
      {
        $match: {
          date: { $gte: startDateStr },
          therapistId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$date',
          sessionsBooked: { $sum: '$counts.sessionsBooked' },
          sessionsCancelled: { $sum: '$counts.sessionsCancelled' },
          sessionsCompleted: { $sum: '$counts.sessionsCompleted' },
          packagesCreated: { $sum: '$counts.packagesCreated' },
          subscriptionsCreated: { $sum: '$counts.subscriptionsCreated' },
          subscriptionsUpgraded: { $sum: '$counts.subscriptionsUpgraded' },
          subscriptionsCancelled: { $sum: '$counts.subscriptionsCancelled' },
          quotaExceeded: { $sum: '$counts.quotaExceeded' },
          featureGated: { $sum: '$counts.featureGated' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          counts: {
            sessionsBooked: '$sessionsBooked',
            sessionsCancelled: '$sessionsCancelled',
            sessionsCompleted: '$sessionsCompleted',
            packagesCreated: '$packagesCreated',
            subscriptionsCreated: '$subscriptionsCreated',
            subscriptionsUpgraded: '$subscriptionsUpgraded',
            subscriptionsCancelled: '$subscriptionsCancelled',
            quotaExceeded: '$quotaExceeded',
            featureGated: '$featureGated',
          },
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Fallback: If no therapist-specific aggregates exist, check global rollups
    if (dailyAggregates.length === 0) {
      const globalRollups = await DailyAggregate.find({
        therapistId: null,
        date: { $gte: startDateStr },
      })
        .sort({ date: 1 })
        .lean();

      if (globalRollups.length > 0) {
        dailyAggregates = globalRollups.map((g) => ({
          date: g.date,
          counts: g.counts || {},
        }));
      }
    }

    // 2. Platform KPIs
    const [totalTherapists, activeTherapists, tierCounts, totalEvents] = await Promise.all([
      Therapist.countDocuments(),
      Therapist.countDocuments({ isActive: true }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$tier', count: { $sum: 1 } } },
      ]),
      AnalyticsEvent.countDocuments(),
    ]);

    const subscriptionsByTier = {
      starter: 0,
      professional: 0,
      clinic: 0,
    };
    tierCounts.forEach((tc) => {
      if (subscriptionsByTier[tc._id] !== undefined) {
        subscriptionsByTier[tc._id] = tc.count;
      }
    });
    subscriptionsByTier.starter = Math.max(
      subscriptionsByTier.starter,
      totalTherapists - (subscriptionsByTier.professional + subscriptionsByTier.clinic)
    );

    // Sum totals over the selected period
    const periodTotals = dailyAggregates.reduce(
      (acc, d) => {
        acc.sessionsBooked += d.counts?.sessionsBooked || 0;
        acc.sessionsCompleted += d.counts?.sessionsCompleted || 0;
        acc.packagesCreated += d.counts?.packagesCreated || 0;
        acc.quotaExceeded += d.counts?.quotaExceeded || 0;
        acc.featureGated += d.counts?.featureGated || 0;
        return acc;
      },
      {
        sessionsBooked: 0,
        sessionsCompleted: 0,
        packagesCreated: 0,
        quotaExceeded: 0,
        featureGated: 0,
      }
    );

    // 3. Top active practitioners in period
    const topTherapists = await DailyAggregate.aggregate([
      {
        $match: {
          date: { $gte: startDateStr },
          therapistId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$therapistId',
          totalSessions: { $sum: '$counts.sessionsBooked' },
          totalPackages: { $sum: '$counts.packagesCreated' },
        },
      },
      { $sort: { totalSessions: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'therapists',
          localField: '_id',
          foreignField: '_id',
          as: 'therapist',
        },
      },
      { $unwind: { path: '$therapist', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalSessions: 1,
          totalPackages: 1,
          name: '$therapist.name',
          email: '$therapist.email',
          slug: '$therapist.slug',
          tier: '$therapist.subscriptionTier',
        },
      },
    ]);

    // 4. Recent platform audit event stream
    const recentEvents = await AnalyticsEvent.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('therapistId', 'name email slug')
      .lean();

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalTherapists,
          activeTherapists,
          totalEvents,
          subscriptionsByTier,
          periodTotals,
        },
        dailyAggregates,
        topTherapists,
        recentEvents,
      },
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve admin analytics.',
    });
  }
};

module.exports = {
  getAdminAnalytics,
  getAnalyticsOverview,
  getAnalyticsEvents,
  getDailyAnalytics,
};

