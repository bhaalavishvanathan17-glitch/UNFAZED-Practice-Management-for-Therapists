import React, { useState, useEffect } from 'react';
import TherapistLayout from '../../components/profile/TherapistLayout';
import api from '../../api/axios';

const FEATURE_CATALOG = [
  { key: 'videoSessions', label: 'Online Telehealth & In-Person Sessions' },
  { key: 'clinicalNotes', label: 'Clinical SOAP & Intake Documentation' },
  { key: 'customBranding', label: 'Personalized Public Website & Slug' },
  { key: 'bulkMessaging', label: 'Client Messaging Portal & Alerts' },
  { key: 'prioritySupport', label: 'Dedicated Practitioner Support' },
  { key: 'advancedAnalytics', label: 'Practice Velocity & Retention Analytics' },
];

export default function SubscriptionManager() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mySubData, setMySubData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [plansRes, meRes, usageRes] = await Promise.allSettled([
        api.get('/api/subscriptions/plans'),
        api.get('/api/subscriptions/me'),
        api.get('/api/subscriptions/usage'),
      ]);

      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data?.data?.plans || []);
      }
      if (meRes.status === 'fulfilled') {
        setMySubData(meRes.value.data?.data || null);
      }
      if (usageRes.status === 'fulfilled') {
        setUsageData(usageRes.value.data?.data || null);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setErrorMsg('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;
    try {
      setIsProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const targetTier = selectedPlan.tier;

      // Check if existing active subscription
      const hasSub = !!mySubData?.subscription;
      let res;
      if (hasSub) {
        res = await api.put('/api/subscriptions/upgrade', {
          newTier: targetTier,
          tier: targetTier,
          billingCycle,
        });
      } else {
        res = await api.post('/api/subscriptions', {
          tier: targetTier,
          billingCycle,
        });
      }

      const planName = targetTier.charAt(0).toUpperCase() + targetTier.slice(1);
      setSuccessMsg(res.data?.message || `Successfully switched to the ${planName} plan!`);
      setShowPlanModal(false);
      setSelectedPlan(null);
      await fetchSubscriptionData();
    } catch (err) {
      console.error('Error changing subscription:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update subscription.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await api.put('/api/subscriptions/cancel', { reason: 'User requested via dashboard' });
      setSuccessMsg(res.data?.message || 'Subscription cancelled successfully.');
      setShowCancelModal(false);
      await fetchSubscriptionData();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to cancel subscription.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Derive current tier and quotas defensively
  const currentTier = mySubData?.tier || usageData?.tier || 'starter';
  const subscription = mySubData?.subscription || null;

  // Session usage & limit
  const sessionUsed =
    usageData?.usage?.sessions?.used ?? mySubData?.usage?.sessionsUsed ?? 0;
  const sessionRawLimit =
    usageData?.usage?.sessions?.limit ??
    mySubData?.limits?.sessionsPerMonth ??
    (currentTier === 'starter' ? 30 : currentTier === 'professional' ? 150 : 0);
  const sessionIsUnlimited = sessionRawLimit === 0 || sessionRawLimit === 'unlimited';
  const sessionPercent = sessionIsUnlimited
    ? 0
    : Math.min(100, Math.round((sessionUsed / Number(sessionRawLimit)) * 100));

  // Package usage & limit
  const packageUsed =
    usageData?.usage?.packages?.used ?? mySubData?.usage?.packagesUsed ?? 0;
  const packageRawLimit =
    usageData?.usage?.packages?.limit ??
    mySubData?.limits?.maxActivePackages ??
    (currentTier === 'starter' ? 3 : currentTier === 'professional' ? 15 : 0);
  const packageIsUnlimited = packageRawLimit === 0 || packageRawLimit === 'unlimited';
  const packagePercent = packageIsUnlimited
    ? 0
    : Math.min(100, Math.round((packageUsed / Number(packageRawLimit)) * 100));

  // Client usage & limit
  const clientUsed = usageData?.usage?.clients?.used ?? 0;
  const clientRawLimit =
    usageData?.usage?.clients?.limit ??
    mySubData?.limits?.maxClients ??
    (currentTier === 'starter' ? 25 : currentTier === 'professional' ? 100 : 0);
  const clientIsUnlimited = clientRawLimit === 0 || clientRawLimit === 'unlimited';

  const formatPlanPrice = (plan, cycle) => {
    if (!plan) return 'Free';
    const monthlyPaise = plan.pricing?.monthlyPaise ?? (plan.tier === 'starter' ? 0 : plan.tier === 'professional' ? 199900 : 499900);
    if (monthlyPaise === 0) return 'Free';

    if (cycle === 'annual') {
      // Annual discount: 15% off annualized price
      const annualPaise = Math.round(monthlyPaise * 12 * 0.85);
      return `₹${(annualPaise / 100).toLocaleString('en-IN')}`;
    }
    return `₹${(monthlyPaise / 100).toLocaleString('en-IN')}`;
  };

  const formatMonthlyEquivalent = (plan, cycle) => {
    if (!plan) return 'Free';
    const monthlyPaise = plan.pricing?.monthlyPaise ?? (plan.tier === 'starter' ? 0 : plan.tier === 'professional' ? 199900 : 499900);
    if (monthlyPaise === 0) return 'Free';

    if (cycle === 'annual') {
      const perMonthPaise = Math.round((monthlyPaise * 12 * 0.85) / 12);
      return `₹${(perMonthPaise / 100).toLocaleString('en-IN')}`;
    }
    return `₹${(monthlyPaise / 100).toLocaleString('en-IN')}`;
  };

  // Fallback plans if API hasn't loaded yet
  const displayPlans = plans.length > 0 ? plans : [
    {
      tier: 'starter',
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
      pricing: { monthlyPaise: 0, label: 'Free' },
    },
    {
      tier: 'professional',
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
      pricing: { monthlyPaise: 199900, label: '₹1,999/mo' },
    },
    {
      tier: 'clinic',
      sessionsPerMonth: 0,
      maxActivePackages: 0,
      maxClients: 0,
      features: {
        clinicalNotes: true,
        videoSessions: true,
        customBranding: true,
        bulkMessaging: true,
        advancedAnalytics: true,
        prioritySupport: true,
      },
      pricing: { monthlyPaise: 499900, label: '₹4,999/mo' },
    },
  ];

  return (
    <TherapistLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <h1 className="text-2xl font-black text-surface-900 tracking-tight">
                Subscription & Practice Entitlements
              </h1>
            </div>
            <p className="text-sm text-surface-500 mt-1">
              Manage your tier quota, unlock clinical features, and scale your independent practice.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center bg-surface-100 p-1 rounded-2xl border border-surface-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-surface-900 shadow-xs'
                  : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-white text-surface-900 shadow-xs'
                  : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-primary-100 text-primary-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-sm flex items-center justify-between">
            <span>✨ {successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-teal-600 hover:text-teal-900 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading subscription quotas and plan tiers...</p>
          </div>
        ) : (
          <>
            {/* Current Active Plan Card & Quota Meters */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-surface-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                      Current Plan
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                        currentTier === 'clinic'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : currentTier === 'professional'
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : 'bg-surface-100 text-surface-700 border border-surface-200'
                      }`}
                    >
                      {currentTier} tier
                    </span>
                    {subscription && (!subscription.endDate || new Date(subscription.endDate) > new Date()) && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-surface-900">
                    {currentTier === 'clinic'
                      ? 'Clinic & Multi-Provider Practice'
                      : currentTier === 'professional'
                      ? 'Professional Practice'
                      : 'Starter Solo Practice'}
                  </h2>
                  <p className="text-xs text-surface-500">
                    {subscription?.endDate
                      ? `Valid until ${new Date(subscription.endDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : 'Free starter tier — perfect for getting your private practice off the ground.'}
                  </p>
                </div>

                {/* Cancel or Change Actions */}
                <div className="flex items-center gap-3">
                  {currentTier !== 'starter' && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2.5 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-600 text-xs font-bold transition cursor-pointer"
                    >
                      Cancel Subscription
                    </button>
                  )}
                  {currentTier !== 'clinic' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = displayPlans.find((p) => p.tier === (currentTier === 'starter' ? 'professional' : 'clinic'));
                        if (target) handleOpenUpgrade(target);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Upgrade Plan ↗
                    </button>
                  )}
                </div>
              </div>

              {/* Usage Quota Progress Meters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* Session Quota Meter */}
                <div className="p-5 rounded-2xl bg-surface-50 border border-surface-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5">
                      <span>📅</span> Monthly Sessions
                    </span>
                    <span className="text-xs font-bold text-surface-900">
                      {sessionUsed} / {sessionIsUnlimited ? '∞' : sessionRawLimit}
                    </span>
                  </div>
                  <div className="w-full bg-surface-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sessionPercent > 90
                          ? 'bg-rose-500'
                          : sessionPercent > 70
                          ? 'bg-amber-500'
                          : 'bg-primary-600'
                      }`}
                      style={{ width: `${sessionIsUnlimited ? 5 : sessionPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-surface-500">
                    {sessionIsUnlimited
                      ? 'Unlimited client sessions permitted.'
                      : `${Math.max(0, Number(sessionRawLimit) - sessionUsed)} sessions remaining in this period.`}
                  </p>
                </div>

                {/* Package Quota Meter */}
                <div className="p-5 rounded-2xl bg-surface-50 border border-surface-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5">
                      <span>📦</span> Active Packages
                    </span>
                    <span className="text-xs font-bold text-surface-900">
                      {packageUsed} / {packageIsUnlimited ? '∞' : packageRawLimit}
                    </span>
                  </div>
                  <div className="w-full bg-surface-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        packagePercent > 90
                          ? 'bg-rose-500'
                          : packagePercent > 70
                          ? 'bg-amber-500'
                          : 'bg-primary-600'
                      }`}
                      style={{ width: `${packageIsUnlimited ? 5 : packagePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-surface-500">
                    {packageIsUnlimited
                      ? 'Unlimited custom package offerings.'
                      : `${Math.max(0, Number(packageRawLimit) - packageUsed)} packages remaining.`}
                  </p>
                </div>

                {/* Client Quota Meter */}
                <div className="p-5 rounded-2xl bg-surface-50 border border-surface-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5">
                      <span>👥</span> Active Client Roster
                    </span>
                    <span className="text-xs font-bold text-surface-900">
                      {clientUsed} / {clientIsUnlimited ? '∞' : clientRawLimit}
                    </span>
                  </div>
                  <div className="w-full bg-surface-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-600 transition-all duration-500"
                      style={{
                        width: `${
                          clientIsUnlimited
                            ? 5
                            : Math.min(100, Math.round((clientUsed / Number(clientRawLimit)) * 100))
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-surface-500">
                    {clientIsUnlimited
                      ? 'Unlimited client records permitted.'
                      : `${Math.max(0, Number(clientRawLimit) - clientUsed)} client slots available.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Tier Selection Cards */}
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-black text-surface-900">Choose the Right Tier for Your Practice</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Seamlessly upgrade anytime. Zero hidden transaction fees.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayPlans.map((p) => {
                  const isCurrent = p.tier === currentTier;
                  const tierName = p.tier.charAt(0).toUpperCase() + p.tier.slice(1);
                  const priceFormatted = formatMonthlyEquivalent(p, billingCycle);

                  return (
                    <div
                      key={p.tier}
                      className={`rounded-3xl p-6 md:p-7 flex flex-col justify-between transition border-2 ${
                        isCurrent
                          ? 'bg-teal-50/40 border-primary-600 shadow-md ring-4 ring-primary-50'
                          : p.tier === 'professional'
                          ? 'bg-white border-primary-300 shadow-xs hover:border-primary-500'
                          : 'bg-white border-surface-200 hover:border-surface-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-surface-500">
                            {tierName}
                          </span>
                          {p.tier === 'professional' && !isCurrent && (
                            <span className="bg-primary-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Popular
                            </span>
                          )}
                          {isCurrent && (
                            <span className="bg-primary-100 text-primary-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Price Display */}
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-surface-900 tracking-tight">
                              {priceFormatted}
                            </span>
                            {p.pricing?.monthlyPaise > 0 && (
                              <span className="text-xs font-bold text-surface-400">/month</span>
                            )}
                          </div>
                          {billingCycle === 'annual' && p.pricing?.monthlyPaise > 0 && (
                            <p className="text-[11px] text-surface-500 mt-1">
                              Billed annually at {formatPlanPrice(p, 'annual')}/year
                            </p>
                          )}
                          {(!p.pricing?.monthlyPaise || p.pricing?.monthlyPaise === 0) && (
                            <p className="text-[11px] text-surface-500 mt-1">Free forever</p>
                          )}
                        </div>

                        <p className="text-xs text-surface-600 border-t border-surface-100 pt-3">
                          {p.tier === 'starter'
                            ? 'Essential tooling for early-stage therapists launching their client practice.'
                            : p.tier === 'professional'
                            ? 'Full practice automation, increased capacity, and flexible discounted packages.'
                            : 'Unlimited volume, multi-provider operations, and dedicated priority support.'}
                        </p>

                        {/* Core Quotas */}
                        <div className="p-3 bg-surface-50 rounded-xl space-y-1 text-xs text-surface-700">
                          <div className="flex justify-between font-semibold">
                            <span>Sessions / month:</span>
                            <span className="font-bold text-surface-900">
                              {p.sessionsPerMonth === 0 ? 'Unlimited' : p.sessionsPerMonth}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Custom Packages:</span>
                            <span className="font-bold text-surface-900">
                              {p.maxActivePackages === 0 ? 'Unlimited' : p.maxActivePackages}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Client Roster Limit:</span>
                            <span className="font-bold text-surface-900">
                              {p.maxClients === 0 ? 'Unlimited' : p.maxClients}
                            </span>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <ul className="space-y-2 pt-1 text-xs text-surface-700">
                          {FEATURE_CATALOG.map((f) => {
                            const isIncluded = !!p.features?.[f.key];
                            return (
                              <li key={f.key} className="flex items-center gap-2">
                                <span className={isIncluded ? 'text-emerald-600 font-bold' : 'text-surface-300'}>
                                  {isIncluded ? '✓' : '—'}
                                </span>
                                <span className={isIncluded ? 'text-surface-800' : 'text-surface-400 line-through'}>
                                  {f.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Action Button */}
                      <div className="pt-6">
                        {isCurrent ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 rounded-xl bg-surface-100 text-surface-400 text-xs font-bold cursor-not-allowed"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenUpgrade(p)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                              p.tier === 'clinic' || p.tier === 'professional'
                                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                                : 'bg-surface-800 hover:bg-surface-900 text-white'
                            }`}
                          >
                            Switch to {tierName}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Upgrade / Confirmation Modal */}
        {showPlanModal && selectedPlan && (
          <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6">
              <div>
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                  Confirm Plan Selection
                </span>
                <h3 className="text-xl font-black text-surface-900 mt-1 capitalize">
                  Switch to {selectedPlan.tier} Plan
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Review plan details and selected billing period before activating.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-50 border border-surface-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-surface-600">Plan Tier:</span>
                  <span className="font-bold text-surface-900 uppercase">{selectedPlan.tier}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface-600">Billing Period:</span>
                  <span className="font-bold text-surface-900 capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface-600">Session Capacity:</span>
                  <span className="font-bold text-surface-900">
                    {selectedPlan.sessionsPerMonth === 0 ? 'Unlimited' : selectedPlan.sessionsPerMonth}/mo
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface-600">Package Capacity:</span>
                  <span className="font-bold text-surface-900">
                    {selectedPlan.maxActivePackages === 0 ? 'Unlimited' : selectedPlan.maxActivePackages}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-surface-200 font-black">
                  <span className="text-surface-900">Total Price:</span>
                  <span className="text-primary-700">
                    {formatPlanPrice(selectedPlan, billingCycle)}
                    {billingCycle === 'annual' && selectedPlan.pricing?.monthlyPaise > 0 ? '/year' : '/month'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-surface-600 hover:bg-surface-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPlanChange}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Confirm & Activate</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Cancel Subscription
                </span>
                <h3 className="text-xl font-black text-surface-900 mt-1">
                  Are you sure you want to cancel?
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Your plan will revert to the Starter plan (up to 30 sessions/month). You will retain all existing client records and clinical notes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-surface-600 hover:bg-surface-100 transition cursor-pointer"
                >
                  Keep My Plan
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TherapistLayout>
  );
}
