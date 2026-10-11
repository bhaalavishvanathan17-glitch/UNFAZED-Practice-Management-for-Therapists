import React, { useState, useEffect } from 'react';
import TherapistLayout from '../../components/profile/TherapistLayout';
import api from '../../api/axios';

export default function BillingManager() {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'packages'
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Package Modal State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [newPackage, setNewPackage] = useState({
    title: '',
    sessionCount: 6,
    priceInr: 7500,
    discountPercent: 15,
    validityDays: 120,
    description: '',
  });
  const [savingPackage, setSavingPackage] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, [statusFilter]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [paymentsRes, packagesRes] = await Promise.all([
        api.get(`/api/payments?status=${statusFilter}&search=${searchQuery}`),
        api.get('/api/packages'),
      ]);

      setPayments(paymentsRes.data?.data?.payments || []);
      setSummary(paymentsRes.data?.data?.summary || null);
      setPackages(packagesRes.data?.data?.packages || []);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setErrorMsg('Failed to load billing records and packages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBillingData();
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    try {
      setSavingPackage(true);
      await api.post('/api/packages', newPackage);
      setShowPackageModal(false);
      setNewPackage({
        title: '',
        sessionCount: 6,
        priceInr: 7500,
        discountPercent: 15,
        validityDays: 120,
        description: '',
      });
      fetchBillingData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create package.');
    } finally {
      setSavingPackage(false);
    }
  };

  return (
    <TherapistLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
              Billing & Invoicing
            </h1>
            <p className="text-sm text-surface-500 mt-1">
              Track client transactions, payment gateway records, automated PDF invoices, and session packages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'
              }`}
            >
              💳 Transactions & Invoices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('packages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'packages'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'
              }`}
            >
              📦 Session Packages
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* FINANCIAL SUMMARY CARDS */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Gross Volume
              </span>
              <div className="text-2xl font-black text-surface-900 mt-2">
                ₹{summary.totalGrossInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-surface-400 mt-1">Total revenue collected</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Net Earnings
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                ₹{summary.totalNetInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-surface-400 mt-1">Disbursed after platform fees</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Platform Fees
              </span>
              <div className="text-2xl font-black text-surface-700 mt-2">
                ₹{summary.totalFeesInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-surface-400 mt-1">Gateway & compliance charges</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Completed Payments
              </span>
              <div className="text-2xl font-black text-primary-600 mt-2">
                {summary.capturedCount}
              </div>
              <p className="text-[11px] text-surface-400 mt-1">
                {summary.failedCount} failed attempts
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: PAYMENTS & INVOICES */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-4 sm:p-5 border-b border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="w-full sm:w-80">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-surface-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Search client, email, invoice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-surface-200 bg-surface-50 focus:bg-white outline-none focus:border-primary-500"
                  />
                </div>
              </form>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-surface-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-surface-200 bg-surface-50 font-medium outline-none cursor-pointer"
                >
                  <option value="all">All Payments</option>
                  <option value="captured">Captured (Paid)</option>
                  <option value="failed">Failed / Declined</option>
                  <option value="created">Pending Checkout</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            {loading ? (
              <div className="p-12 text-center text-sm text-surface-500">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading payment records...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-sm text-surface-500">
                No payment transactions found matching the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Ref</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Service / Package</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">Net Received</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 text-xs text-surface-800">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-surface-50/80 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-surface-900">
                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="font-mono text-[10px] text-surface-400">
                            {p.invoiceNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-surface-900">{p.clientName}</div>
                          <div className="text-[11px] text-surface-500">{p.clientEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-surface-900">{p.itemTitle}</div>
                          <div className="text-[10px] text-surface-400 font-mono">
                            Gateway: {p.razorpayOrderId.slice(0, 16)}...
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                          ₹{(p.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ₹{(p.netAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'captured'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <a
                            href={`/api/payments/${p._id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-primary-50 hover:text-primary-600 text-surface-700 font-bold text-[11px] transition"
                          >
                            <span>PDF</span>
                            <span>⬇</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKAGES MANAGEMENT */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-surface-900">Session Packages</h2>
                <p className="text-xs text-surface-500">
                  Curate multi-session discount bundles for clients on your public profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPackageModal(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                + Add Custom Package
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg._id}
                  className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-primary-600">
                        {pkg.sessionCount} SESSIONS
                      </span>
                      {pkg.discountPercent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {pkg.discountPercent}% SAVINGS
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-surface-900 mb-1">{pkg.title}</h3>
                    <p className="text-xs text-surface-500 mb-4">{pkg.description}</p>
                  </div>

                  <div className="pt-4 border-t border-surface-100">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xl font-black text-surface-900">
                        ₹{(pkg.pricePaise / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-surface-500 font-medium">
                        ₹{(pkg.perSessionPricePaise / 100).toLocaleString('en-IN')} / session
                      </span>
                    </div>
                    <p className="text-[11px] text-surface-400 mt-1">
                      ⏳ Valid for {pkg.validityDays} Days after purchase
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEW PACKAGE MODAL */}
        {showPackageModal && (
          <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-200 relative">
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-surface-900 mb-1">Create New Package</h3>
              <p className="text-xs text-surface-500 mb-4">
                Define session count, pricing, and discount percentage.
              </p>

              <form onSubmit={handleCreatePackage} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Package Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cognitive Renewal (8 Sessions)"
                    value={newPackage.title}
                    onChange={(e) => setNewPackage({ ...newPackage, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Sessions Count *</label>
                    <select
                      value={newPackage.sessionCount}
                      onChange={(e) => setNewPackage({ ...newPackage, sessionCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                    >
                      <option value={3}>3 Sessions</option>
                      <option value={6}>6 Sessions</option>
                      <option value={12}>12 Sessions</option>
                      <option value={15}>15 Sessions</option>
                      <option value={20}>20 Sessions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Total Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={500}
                      value={newPackage.priceInr}
                      onChange={(e) => setNewPackage({ ...newPackage, priceInr: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={newPackage.discountPercent}
                      onChange={(e) => setNewPackage({ ...newPackage, discountPercent: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">Validity (Days)</label>
                    <input
                      type="number"
                      min={15}
                      value={newPackage.validityDays}
                      onChange={(e) => setNewPackage({ ...newPackage, validityDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Clinical benefits of this package..."
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPackage}
                  className="w-full mt-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 cursor-pointer"
                >
                  {savingPackage ? 'Saving...' : 'Save & Publish Package'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </TherapistLayout>
  );
}
