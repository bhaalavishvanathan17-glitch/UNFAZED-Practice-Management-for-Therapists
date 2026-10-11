import React, { useState, useEffect } from 'react';
import TherapistLayout from '../../components/profile/TherapistLayout';
import api from '../../api/axios';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [overview, setOverview] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchAnalyticsOverview();
    fetchDailyAggregates();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [page, categoryFilter, actionFilter]);

  const fetchAnalyticsOverview = async () => {
    try {
      const res = await api.get('/api/analytics/overview');
      setOverview(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
      setErrorMsg('Failed to load practice analytics overview.');
    }
  };

  const fetchDailyAggregates = async () => {
    try {
      const res = await api.get('/api/analytics/daily?days=14');
      setDailyData(res.data?.data?.aggregates || []);
    } catch (err) {
      console.error('Error fetching daily aggregates:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (categoryFilter) params.append('category', categoryFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/api/analytics/events?${params.toString()}`);
      setEvents(res.data?.data?.events || []);
      setPagination(res.data?.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Error fetching event stream:', err);
    } finally {
      setLoading(false);
    }
  };

  const totals = overview?.last30Days || {};
  const currentTier = overview?.tier || 'starter';
  const tierLimits = overview?.tierLimits || {};

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
    <TherapistLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h1 className="text-2xl font-black text-surface-900 tracking-tight">
                Practice Analytics & Entitlement Health
              </h1>
            </div>
            <p className="text-sm text-surface-500 mt-1">
              Real-time operational metrics, session velocity, and platform activity audit log.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Real-time Emitter Active
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-surface-500">
              <span className="text-xs font-bold uppercase tracking-wider">Sessions Booked (30d)</span>
              <span className="text-lg">📅</span>
            </div>
            <div className="text-3xl font-black text-surface-900">
              {totals.sessionsBooked ?? 0}
            </div>
            <p className="text-[11px] text-surface-500">
              Across all private & public booking channels
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-surface-500">
              <span className="text-xs font-bold uppercase tracking-wider">Packages Offered (30d)</span>
              <span className="text-lg">📦</span>
            </div>
            <div className="text-3xl font-black text-surface-900">
              {totals.packagesCreated ?? 0}
            </div>
            <p className="text-[11px] text-surface-500">
              Multi-session discounted packages created
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-surface-500">
              <span className="text-xs font-bold uppercase tracking-wider">Current Tier Headroom</span>
              <span className="text-lg">⚡</span>
            </div>
            <div className="text-3xl font-black text-surface-900 capitalize">
              {currentTier}
            </div>
            <p className="text-[11px] text-surface-500">
              {tierLimits.maxSessionsPerMonth
                ? `${tierLimits.maxSessionsPerMonth} sessions/mo cap`
                : 'Unlimited session volume'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-surface-200 p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-surface-500">
              <span className="text-xs font-bold uppercase tracking-wider">Entitlement Health</span>
              <span className="text-lg">🛡️</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {totals.quotaExceeded === 0 ? '100% OK' : `${totals.quotaExceeded} Blocked`}
            </div>
            <p className="text-[11px] text-surface-500">
              {totals.quotaExceeded === 0
                ? 'Zero quota rejections recorded'
                : 'Quota limits reached in period'}
            </p>
          </div>
        </div>

        {/* 14-Day Velocity Time-Series */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-surface-900">14-Day Activity Velocity</h2>
              <p className="text-xs text-surface-500">
                Daily aggregated event counts recorded by the analytics listener.
              </p>
            </div>
            <span className="text-xs font-bold text-surface-400">Daily rollups</span>
          </div>

          {dailyData.length === 0 ? (
            <div className="py-12 text-center text-xs text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
              No daily rollups recorded yet. Activity will plot here as appointments are booked.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
              {dailyData.map((d) => (
                <div
                  key={d.date}
                  className="p-3.5 rounded-2xl bg-surface-50 border border-surface-100 flex flex-col justify-between space-y-2"
                >
                  <span className="text-[10px] font-bold text-surface-400 uppercase">
                    {new Date(d.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div>
                    <div className="text-lg font-black text-surface-900">
                      {(d.counts?.sessionsBooked || 0) + (d.counts?.packagesCreated || 0)}
                    </div>
                    <span className="text-[10px] text-surface-500">events</span>
                  </div>
                  <div className="text-[10px] space-y-0.5 text-surface-600 border-t border-surface-100 pt-1.5">
                    <div>📅 {d.counts?.sessionsBooked || 0} sessions</div>
                    <div>📦 {d.counts?.packagesCreated || 0} pkgs</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Analytics Event Stream */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 md:p-7 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-surface-900">Real-time Event Stream</h2>
              <p className="text-xs text-surface-500">
                Direct audit stream of emitted events, entitlements, and subscription changes.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold text-surface-700"
              >
                <option value="">All Categories</option>
                <option value="session">Session</option>
                <option value="package">Package</option>
                <option value="subscription">Subscription</option>
                <option value="entitlement">Entitlement</option>
              </select>

              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold text-surface-700"
              >
                <option value="">All Actions</option>
                <option value="session_booked">Session Booked</option>
                <option value="package_created">Package Created</option>
                <option value="subscription_upgraded">Upgraded</option>
                <option value="quota_exceeded">Quota Exceeded</option>
                <option value="feature_gated">Feature Gated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-surface-400">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Fetching event stream...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-xs text-surface-400 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
              No matching events found in the audit log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-100 text-surface-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Tier</th>
                    <th className="py-3 px-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-surface-700">
                  {events.map((ev) => (
                    <tr key={ev._id} className="hover:bg-surface-50/60 transition">
                      <td className="py-3 px-3 whitespace-nowrap text-surface-500 font-medium">
                        {new Date(ev.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-bold uppercase text-[10px] text-surface-600">
                        {ev.category}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getActionBadgeColor(
                            ev.action
                          )}`}
                        >
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap uppercase font-semibold text-surface-500 text-[10px]">
                        {ev.tier || 'starter'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-surface-600 max-w-xs truncate">
                        {ev.metadata ? JSON.stringify(ev.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-surface-100 text-xs">
              <span className="text-surface-500">
                Page {page} of {pagination.pages} ({pagination.total} total events)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl border border-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-50 font-bold"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 rounded-xl border border-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-50 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TherapistLayout>
  );
}
