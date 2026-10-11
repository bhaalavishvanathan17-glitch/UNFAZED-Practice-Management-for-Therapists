import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import BookingModal from '../../components/scheduling/BookingModal';
import RazorpayCheckoutModal from '../../components/payment/RazorpayCheckoutModal';

export default function PublicProfile() {
  const { slug } = useParams();
  const [therapist, setTherapist] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Package Purchase Flow (Module 4)
  const [selectedPackageForPurchase, setSelectedPackageForPurchase] = useState(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageClientForm, setPackageClientForm] = useState({ name: '', email: '', phone: '' });
  const [packageOrderLoading, setPackageOrderLoading] = useState(false);
  const [packageOrderError, setPackageOrderError] = useState('');
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchasedPackageSuccess, setPurchasedPackageSuccess] = useState(null);

  const handleOpenBooking = (service = null) => {
    setSelectedServiceForBooking(service || therapist?.services?.[0] || null);
    setIsBookingOpen(true);
  };

  const handleInitiatePackagePurchase = (pkg) => {
    setSelectedPackageForPurchase(pkg);
    setPackageOrderError('');
    setIsPackageModalOpen(true);
  };

  const handleCreatePackageOrder = async (e) => {
    e.preventDefault();
    if (!packageClientForm.name || !packageClientForm.email) {
      setPackageOrderError('Name and email are required.');
      return;
    }

    try {
      setPackageOrderLoading(true);
      setPackageOrderError('');

      const res = await api.post('/api/payments/order', {
        therapistSlug: slug,
        itemType: 'package',
        packageId: selectedPackageForPurchase._id,
        clientName: packageClientForm.name,
        clientEmail: packageClientForm.email,
        clientPhone: packageClientForm.phone,
      });

      setCheckoutOrder(res.data.data);
      setIsPackageModalOpen(false);
      setShowCheckout(true);
    } catch (err) {
      setPackageOrderError(err?.response?.data?.message || 'Failed to create payment order for package.');
    } finally {
      setPackageOrderLoading(false);
    }
  };

  const handlePackagePaymentSuccess = ({ payment, invoiceUrl }) => {
    setShowCheckout(false);
    setPurchasedPackageSuccess({
      payment,
      package: selectedPackageForPurchase,
      invoiceUrl,
    });
  };

  const handlePackagePaymentFailure = (failReason) => {
    setShowCheckout(false);
    alert(`Payment declined: ${failReason}`);
  };

  useEffect(() => {
    const fetchTherapistAndPackages = async () => {
      setLoading(true);
      setError('');
      try {
        const [therapistRes, packagesRes] = await Promise.all([
          api.get(`/api/therapists/public/${slug}`),
          api.get(`/api/packages/public/${slug}`).catch(() => ({ data: { data: { packages: [] } } })),
        ]);
        setTherapist(therapistRes.data.data.therapist);
        setPackages(packagesRes.data?.data?.packages || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Therapist profile not found.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchTherapistAndPackages();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-surface-600">Loading therapist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !therapist) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-200 text-surface-500 flex items-center justify-center text-3xl mb-4">
          🔍
        </div>
        <h1 className="text-2xl font-bold text-surface-900">Profile Not Found</h1>
        <p className="text-sm text-surface-500 mt-2 max-w-sm">
          {error || `The therapist profile "/${slug}" could not be located or is currently unavailable.`}
        </p>
        <Link
          to="/"
          className="mt-6 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
        >
          Return to UNFAZED Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-bold text-xs">
              U
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
              UNFAZED Practice Network
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#services"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm shadow-primary-600/20"
            >
              Book Consultation
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50/70 to-surface-50 py-12 sm:py-16 px-4 sm:px-6 border-b border-surface-200/60">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            {/* Avatar / Monogram */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-black text-4xl sm:text-5xl flex items-center justify-center shadow-xl shadow-primary-600/20 shrink-0">
              {therapist.name ? therapist.name.charAt(0) : 'D'}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
                  {therapist.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Verified Practitioner
                </span>
              </div>

              <p className="text-base sm:text-lg text-primary-800 font-medium">
                {therapist.headline || 'Licensed Mental Health Professional'}
              </p>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-surface-500 pt-1">
                {therapist.city && (
                  <span className="flex items-center gap-1.5">
                    <span>📍</span> {therapist.city}
                  </span>
                )}
                {therapist.experienceYears > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span>⏳</span> {therapist.experienceYears}+ Years Clinical Experience
                  </span>
                )}
                {therapist.languages?.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span>🗣️</span> {therapist.languages.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: About & Specializations & Services */}
        <div className="md:col-span-2 space-y-8">
          {/* About Section */}
          <section className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
              <span>🌿</span> About & Therapeutic Approach
            </h2>
            <div className="text-sm text-surface-600 leading-relaxed whitespace-pre-line">
              {therapist.bio ||
                `Welcome. I am ${therapist.name}, dedicated to providing a safe, confidential, and empathetic therapeutic environment. Through collaborative evidence-based techniques, I support individuals navigating life challenges, emotional distress, and relationship issues.`}
            </div>
          </section>

          {/* Specializations & Focus Areas */}
          {therapist.specializations?.length > 0 && (
            <section className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                <span>🎯</span> Areas of Clinical Focus
              </h2>
              <div className="flex flex-wrap gap-2">
                {therapist.specializations.map((spec, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-surface-100 border border-surface-200 text-surface-800 text-xs font-semibold"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Services & Single Session Booking */}
          <section id="services" className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-surface-900 mb-2 flex items-center gap-2">
              <span>💼</span> Individual Consultation Services
            </h2>
            <p className="text-xs text-surface-500 mb-6">
              Select a session type below to book your appointment slot.
            </p>

            <div className="space-y-4">
              {therapist.services && therapist.services.length > 0 ? (
                therapist.services.map((service, index) => (
                  <div
                    key={service._id || index}
                    className="p-5 rounded-xl border border-surface-200 hover:border-primary-400 bg-surface-50/50 hover:bg-primary-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-surface-900">{service.title}</h3>
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-surface-200 text-surface-700">
                          {service.mode}
                        </span>
                      </div>
                      <p className="text-xs text-surface-600 max-w-md">{service.description}</p>
                      <div className="text-xs font-medium text-surface-500 pt-1">
                        ⏱️ {service.durationMinutes} Minutes Session
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="text-lg font-extrabold text-surface-900">
                        ₹{service.priceInr.toLocaleString('en-IN')}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(service)}
                        className="mt-2 w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
                      >
                        Book Session
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-surface-500">No services currently listed.</p>
              )}
            </div>
          </section>

          {/* Module 4: Session Packages & Bundles */}
          {packages && packages.length > 0 && (
            <section id="packages" className="bg-gradient-to-br from-primary-950 to-surface-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 relative z-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold border border-primary-500/30 mb-2">
                    <span>✨</span> Multi-Session Care Packages
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Sustained Therapy Bundles
                  </h2>
                </div>
                <span className="text-xs text-primary-200/80">Save up to 20% on continuous care</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                {packages.map((pkg) => (
                  <div
                    key={pkg._id}
                    className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-primary-400 hover:bg-white/10 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-mono font-bold text-primary-300">
                          {pkg.sessionCount} Sessions
                        </span>
                        {pkg.discountPercent > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {pkg.discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{pkg.title}</h3>
                      <p className="text-xs text-surface-300 line-clamp-2 mb-3">{pkg.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-lg font-black text-white">
                          ₹{(pkg.pricePaise / 100).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-surface-400">
                          ₹{(pkg.perSessionPricePaise / 100).toLocaleString('en-IN')}/sess
                        </span>
                      </div>
                      <p className="text-[10px] text-surface-400 mb-3">
                        ⏳ Valid for {pkg.validityDays} Days
                      </p>
                      <button
                        type="button"
                        onClick={() => handleInitiatePackagePurchase(pkg)}
                        className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Purchase Package
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Credentials Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Professional Credentials
            </h3>

            {therapist.qualifications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                  Education & Licensure
                </p>
                <ul className="space-y-2">
                  {therapist.qualifications.map((q, i) => (
                    <li key={i} className="text-xs text-surface-700 flex items-start gap-2">
                      <span className="text-primary-600">✓</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-surface-100">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                Consultation Guarantee
              </p>
              <p className="text-xs text-surface-600 leading-relaxed">
                All sessions adhere to strict patient confidentiality, empathetic standards, and ethical counseling guidelines.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        therapist={therapist}
        selectedService={selectedServiceForBooking}
      />

      {/* Package Purchase Modal */}
      {isPackageModalOpen && selectedPackageForPurchase && (
        <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-200 relative">
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-surface-900 mb-1">
              Purchase {selectedPackageForPurchase.title}
            </h3>
            <p className="text-xs text-surface-500 mb-4">
              {selectedPackageForPurchase.sessionCount} Sessions • Valid for {selectedPackageForPurchase.validityDays} Days • Total: ₹{(selectedPackageForPurchase.pricePaise / 100).toLocaleString('en-IN')}
            </p>

            {packageOrderError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {packageOrderError}
              </div>
            )}

            <form onSubmit={handleCreatePackageOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={packageClientForm.name}
                  onChange={(e) => setPackageClientForm({ ...packageClientForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={packageClientForm.email}
                  onChange={(e) => setPackageClientForm({ ...packageClientForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">WhatsApp / Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={packageClientForm.phone}
                  onChange={(e) => setPackageClientForm({ ...packageClientForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={packageOrderLoading}
                className="w-full mt-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 cursor-pointer"
              >
                {packageOrderLoading ? 'Creating Order...' : `Proceed to Payment (₹${(selectedPackageForPurchase.pricePaise / 100).toLocaleString('en-IN')})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Package Purchase Success Modal */}
      {purchasedPackageSuccess && (
        <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-surface-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="text-xl font-black text-surface-900">Package Activated!</h2>
            <p className="text-xs text-surface-600">
              Your <strong className="text-surface-900">{purchasedPackageSuccess.package?.title}</strong> ({purchasedPackageSuccess.package?.sessionCount} Sessions) has been assigned to your practice account.
            </p>
            <div className="p-3 bg-surface-50 rounded-2xl border border-surface-200 text-xs font-mono text-primary-600">
              Invoice Ref: {purchasedPackageSuccess.payment.invoiceNumber}
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`/api/payments/${purchasedPackageSuccess.payment._id}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                Download Official PDF Invoice ⬇
              </a>
              <button
                type="button"
                onClick={() => setPurchasedPackageSuccess(null)}
                className="w-full py-2 border border-surface-200 hover:bg-surface-50 text-surface-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Test Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        orderDetails={checkoutOrder}
        onPaymentSuccess={handlePackagePaymentSuccess}
        onPaymentFailure={handlePackagePaymentFailure}
      />

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-surface-200 bg-white text-center text-xs text-surface-500">
        <p>Practicing with UNFAZED — Secure practice management for therapists in India.</p>
      </footer>
    </div>
  );
}
