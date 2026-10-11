import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAdminAnalytics();
  }, [days]);

  const fetchAdminAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/api/analytics?days=${days}`);
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
      setErrorMsg('Failed to load platform-wide analytics for admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const periodTotals = summary?.periodTotals || {};
  const subscriptions = summary?.subscriptionsByTier || {};
  const dailyAggregates = data?.dailyAggregates || [];
  const topTherapists = data?.topTherapists || [];
  const recentEvents = data?.recentEvents || [];

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'session_booked':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'package_created':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'subscription_upgraded':
      case 'subscription_created':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'quota_exceeded':
      case 'feature_gated':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-surface-100 text-surface-700 border-surface-200';
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-800 font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-xs">
                <span className="text-white font-bold text-sm">U</span>
              </div>
              <span className="text-lg font-black tracking-tight text-surface-900">UNFAZED</span>
            </Link>
            <span className="bg-surface-100 text-surface-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-surface-600 hidden sm:inline">
                Live Analytics Pipeline
              </span>
            </div>
            <Link
              to="/dashboard/profile"
              className="px-3.5 py-1.5 rounded-xl border border-surface-200 hover:bg-surface-50 text-xs font-bold text-surface-700 transition"
            >
              Therapist Hub ↗
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title & Time Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-surface-900 tracking-tight flex items-center gap-2.5">
              <span>🛡️</span> Platform Analytics & Daily Aggregates
            </h1>
            <p className="text-xs text-surface-500 mt-1">
              Global operational intelligence, MongoDB daily rollups, and practitioner telemetry.
            </p>
          </div>

          <div className="inline-flex items-center bg-white p-1 rounded-2xl border border-surface-200 shadow-2xs self-start sm:self-auto">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                  days === d
                    ? 'bg-surface-900 text-white shadow-xs'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading platform daily aggregates...</p>
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-surface-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Therapists</span>
                  <span className="text-lg">👥</span>
                </div>
                <div className="text-3xl font-black text-surface-900">
                  {summary.totalTherapists ?? 0}
                </div>
                <p className="text-[11px] text-surface-500">
                  {summary.activeTherapists ?? 0} active practitioner profiles
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-surface-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Sessions Booked ({days}d)</span>
                  <span className="text-lg">📅</span>
                </div>
                <div className="text-3xl font-black text-surface-900">
                  {periodTotals.sessionsBooked ?? 0}
                </div>
                <p className="text-[11px] text-surface-500">
                  {periodTotals.sessionsCompleted ?? 0} sessions completed
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-surface-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Packages Offered ({days}d)</span>
                  <span className="text-lg">📦</span>
                </div>
                <div className="text-3xl font-black text-surface-900">
                  {periodTotals.packagesCreated ?? 0}
                </div>
                <p className="text-[11px] text-surface-500">
                  Multi-session offerings created
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-surface-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Quota Violations ({days}d)</span>
                  <span className="text-lg">🛡️</span>
                </div>
                <div className="text-3xl font-black text-emerald-600">
                  {periodTotals.quotaExceeded === 0 ? '0 (Clean)' : periodTotals.quotaExceeded}
                </div>
                <p className="text-[11px] text-surface-500">
                  {periodTotals.quotaExceeded === 0
                    ? 'All practitioner quotas within tier limits'
                    : 'Tier limits triggered'}
                </p>
              </div>
            </div>

            {/* Subscriptions by Tier & Breakdown */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-surface-900">Active Subscription Distribution</h2>
                  <p className="text-xs text-surface-500">
                    Practitioners segmented by active monetization tier.
                  </p>
                </div>
                <span className="text-xs font-bold text-surface-400">SaaS Tiers</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-surface-50 border border-surface-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-surface-500 uppercase">Starter Tier (Free)</span>
                    <div className="text-2xl font-black text-surface-900 mt-1">
                      {subscriptions.starter ?? 0}
                    </div>
                    <span className="text-[11px] text-surface-500">Up to 15 sessions/mo</span>
                  </div>
                  <span className="text-2xl">🌱</span>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 uppercase">Professional Tier</span>
                    <div className="text-2xl font-black text-teal-900 mt-1">
                      {subscriptions.professional ?? 0}
                    </div>
                    <span className="text-[11px] text-teal-700">₹2,999/mo · 60 sessions</span>
                  </div>
                  <span className="text-2xl">💼</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Clinic Tier</span>
                    <div className="text-2xl font-black text-amber-900 mt-1">
                      {subscriptions.clinic ?? 0}
                    </div>
                    <span className="text-[11px] text-amber-700">₹6,999/mo · Unlimited</span>
                  </div>
                  <span className="text-2xl">🏥</span>
                </div>
              </div>
            </div>

            {/* Daily Aggregates Time-Series Rollup */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-surface-900">
                    MongoDB Daily Aggregates ({dailyAggregates.length} days recorded)
                  </h2>
                  <p className="text-xs text-surface-500">
                    Pre-computed daily rollups queried from the <code className="font-mono text-primary-700">DailyAggregate</code> collection.
                  </p>
                </div>
                <span className="text-xs font-bold text-surface-400">/api/analytics</span>
              </div>

              {dailyAggregates.length === 0 ? (
                <div className="py-12 text-center text-xs text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
                  No daily aggregate rollups recorded in this date range. As sessions and packages are created, records accumulate here automatically.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-3 pt-2">
                  {dailyAggregates.map((d) => (
                    <div
                      key={d.date}
                      className="p-3.5 rounded-2xl bg-surface-50 border border-surface-100 flex flex-col justify-between space-y-2 hover:border-surface-300 transition"
                    >
                      <span className="text-[10px] font-bold text-surface-500 uppercase">
                        {new Date(d.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <div>
                        <div className="text-lg font-black text-surface-900">
                          {(d.counts?.sessionsBooked || 0) + (d.counts?.packagesCreated || 0)}
                        </div>
                        <span className="text-[10px] text-surface-400">activity units</span>
                      </div>
                      <div className="text-[10px] space-y-0.5 text-surface-600 border-t border-surface-100 pt-1.5">
                        <div>📅 {d.counts?.sessionsBooked || 0} sessions</div>
                        <div>📦 {d.counts?.packagesCreated || 0} pkgs</div>
                        <div>💎 {d.counts?.subscriptionsUpgraded || 0} upgrades</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Active Practitioners & Recent Event Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Practitioners */}
              <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-base font-black text-surface-900">Top Active Practitioners</h2>
                  <p className="text-xs text-surface-500">
                    Highest volume therapists over the last {days} days.
                  </p>
                </div>

                {topTherapists.length === 0 ? (
                  <div className="py-8 text-center text-xs text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
                    No active sessions recorded in this period.
                  </div>
                ) : (
                  <div className="divide-y divide-surface-100">
                    {topTherapists.map((t, idx) => (
                      <div key={t._id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-surface-900 flex items-center gap-1.5">
                            <span className="text-surface-400">#{idx + 1}</span>
                            <span>{t.name || 'Therapist'}</span>
                          </div>
                          <span className="text-[10px] text-surface-400 font-mono">
                            /{t.slug || t._id}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-surface-900 block">
                            {t.totalSessions} sessions
                          </span>
                          <span className="text-[10px] font-bold text-primary-600 uppercase">
                            {t.tier || 'starter'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Audit Log */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-surface-900">Platform Event Audit Log</h2>
                    <p className="text-xs text-surface-500">
                      Real-time events persisted to MongoDB <code className="font-mono text-primary-700">AnalyticsEvent</code>.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-surface-400">Latest 20 events</span>
                </div>

                {recentEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
                    No events logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-surface-100 text-surface-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Practitioner</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Tier</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 text-surface-700">
                        {recentEvents.map((ev) => (
                          <tr key={ev._id} className="hover:bg-surface-50/60 transition">
                            <td className="py-2.5 px-3 whitespace-nowrap text-surface-500 text-[11px]">
                              {new Date(ev.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-medium text-surface-800">
                              {ev.therapistId?.name || 'Practitioner'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getActionBadgeColor(
                                  ev.action
                                )}`}
                              >
                                {ev.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap uppercase font-semibold text-surface-500 text-[10px]">
                              {ev.tier || 'starter'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-surface-500 max-w-xs truncate">
                              {ev.metadata ? JSON.stringify(ev.metadata) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
