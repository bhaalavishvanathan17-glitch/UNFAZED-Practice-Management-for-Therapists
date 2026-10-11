import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { format, addDays } from 'date-fns';
import RazorpayCheckoutModal from '../payment/RazorpayCheckoutModal';

export default function BookingModal({
  isOpen,
  onClose,
  therapist,
  selectedService,
  onBookingSuccess,
}) {
  // 14 days booking window
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Advance Payment State (Module 4)
  const [payAdvance, setPayAdvance] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [paidPayment, setPaidPayment] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);

  // Client Intake form state
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    intakeNotes: '',
    consentAgreed: false,
  });

  // Calculate next 10 days for date selector pill bar
  const dateOptions = Array.from({ length: 12 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      dateStr: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'),
      dayNumber: format(d, 'd'),
      monthName: format(d, 'MMM'),
    };
  });

  useEffect(() => {
    if (isOpen && therapist?.slug && selectedDate) {
      fetchSlots();
    }
  }, [isOpen, selectedDate, selectedService]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      setErrorMsg('');
      setSelectedSlot(null);
      const duration = selectedService?.durationMinutes || 60;
      const res = await api.get(
        `/api/availability/slots/${therapist.slug}?date=${selectedDate}&duration=${duration}`
      );
      setAvailableSlots(res.data.data.slots || []);
    } catch (err) {
      setErrorMsg('Could not fetch available slots for this date.');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMsg('Please select a time slot to continue.');
      return;
    }
    if (!clientForm.consentAgreed) {
      setErrorMsg('Please review and check the confidentiality & consent agreement.');
      return;
    }

    setBooking(true);
    setErrorMsg('');

    try {
      const payload = {
        therapistSlug: therapist.slug,
        clientName: clientForm.name,
        clientEmail: clientForm.email,
        clientPhone: clientForm.phone,
        startDateTimeUTC: selectedSlot.startDateTimeUTC,
        durationMinutes: selectedService?.durationMinutes || 60,
        serviceTitle: selectedService?.title || 'Individual Therapy',
        priceInr: selectedService?.priceInr || 1500,
        mode: selectedService?.mode || 'video',
        intakeNotes: clientForm.intakeNotes,
      };

      const res = await api.post('/api/sessions/book', payload);
      const bookedSession = res.data.data.session;

      if (payAdvance) {
        // Create Payment Order linked to this session
        const orderRes = await api.post('/api/payments/order', {
          therapistSlug: therapist.slug,
          itemType: 'single_session',
          serviceTitle: bookedSession.serviceTitle,
          durationMinutes: bookedSession.durationMinutes,
          clientName: clientForm.name,
          clientEmail: clientForm.email,
          clientPhone: clientForm.phone,
          sessionId: bookedSession._id,
        });

        setPendingSession(bookedSession);
        setCheckoutOrder(orderRes.data.data);
        setShowCheckout(true);
      } else {
        setSuccessData(bookedSession);
        if (onBookingSuccess) onBookingSuccess(bookedSession);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to confirm booking. Slot may have been taken.');
    } finally {
      setBooking(false);
    }
  };

  const handlePaymentSuccess = ({ payment }) => {
    setShowCheckout(false);
    setPaidPayment(payment);
    const updated = {
      ...pendingSession,
      paymentStatus: 'paid',
      paymentId: payment._id,
    };
    setSuccessData(updated);
    if (onBookingSuccess) onBookingSuccess(updated);
  };

  const handlePaymentFailure = (failReason) => {
    setShowCheckout(false);
    setErrorMsg(`Payment declined (${failReason}). Your appointment was recorded as pending payment.`);
    setSuccessData(pendingSession);
    if (onBookingSuccess) onBookingSuccess(pendingSession);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-surface-200 relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
        >
          ✕
        </button>

        {successData ? (
          /* Confirmation Screen */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="text-2xl font-black text-surface-900">Appointment Confirmed!</h2>
            <p className="text-sm text-surface-600 max-w-md mx-auto">
              Your session with <span className="font-bold text-surface-900">{therapist.name}</span> is scheduled. A confirmation has been sent to your email.
            </p>

            <div className="p-4 bg-surface-50 rounded-2xl border border-surface-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-surface-500">Service:</span>
                <span className="font-bold text-surface-800">{successData.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Duration:</span>
                <span className="font-bold text-surface-800">{successData.durationMinutes} Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Fee:</span>
                <span className="font-bold text-surface-800">₹{successData.priceInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Mode:</span>
                <span className="font-bold text-surface-800 uppercase">{successData.mode}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-surface-200">
                <span className="text-surface-500">Virtual Room:</span>
                <a
                  href={successData.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary-600 hover:underline truncate max-w-xs"
                >
                  Join Google Meet
                </a>
              </div>

              {/* Module 4: Verified Payment & Tax Invoice */}
              {paidPayment && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                      <span>✓</span>
                      <span>Payment Verified (Razorpay Test Mode)</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-mono mt-0.5">
                      Invoice Ref: {paidPayment.invoiceNumber}
                    </p>
                  </div>
                  <a
                    href={`/api/payments/${paidPayment._id}/invoice`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Download PDF Invoice ⬇</span>
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* Booking Step Flow */
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
                Step 1: Choose Date & Time
              </span>
              <h2 className="text-xl font-bold text-surface-900 mt-1">
                Book with {therapist.name}
              </h2>
              <p className="text-xs text-surface-500">
                {selectedService?.title || 'Individual Therapy'} • {selectedService?.durationMinutes || 60} mins • ₹{selectedService?.priceInr || 1500}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Date Selector Pills */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-2">
                Select Date
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {dateOptions.map((item) => (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`px-3 py-2 rounded-xl text-center shrink-0 border transition cursor-pointer ${
                      selectedDate === item.dateStr
                        ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/20'
                        : 'bg-white border-surface-200 text-surface-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-wider">{item.dayName}</div>
                    <div className="text-base font-extrabold">{item.dayNumber}</div>
                    <div className="text-[9px] uppercase">{item.monthName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Grid */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-2">
                Available Time Slots (IST)
              </label>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-surface-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Calculating real-time slots...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 rounded-2xl bg-surface-50 border border-surface-200 text-center">
                  <p className="text-xs font-medium text-surface-500">
                    No open slots available on {selectedDate}.
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Try selecting another day from the bar above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        selectedSlot?.startDateTimeUTC === slot.startDateTimeUTC
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-surface-50 border-surface-200 text-surface-800 hover:border-primary-400 hover:bg-white'
                      }`}
                    >
                      {slot.formattedTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client Contact & Intake Form */}
            {selectedSlot && (
              <form onSubmit={handleBook} className="pt-4 border-t border-surface-100 space-y-4">
                <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider block">
                  Step 2: Client Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      WhatsApp / Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      What would you like to focus on in this session? (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief note on your current symptoms or goals..."
                      value={clientForm.intakeNotes}
                      onChange={(e) => setClientForm({ ...clientForm, intakeNotes: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500 resize-none"
                    />
                  </div>
                </div>

                {/* Digital Consent */}
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consent"
                    required
                    checked={clientForm.consentAgreed}
                    onChange={(e) => setClientForm({ ...clientForm, consentAgreed: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="consent" className="text-[11px] text-surface-600 cursor-pointer">
                    I agree to the practice terms and understand this session is governed by client confidentiality and ethical counseling standards.
                  </label>
                </div>

                {/* Advance Payment Option (Module 4) */}
                <div className="p-3.5 bg-primary-50/70 rounded-xl border border-primary-200/80 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="payAdvance"
                    checked={payAdvance}
                    onChange={(e) => setPayAdvance(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-primary-600 rounded border-primary-300 focus:ring-primary-500 cursor-pointer"
                  />
                  <div className="text-[11px]">
                    <label htmlFor="payAdvance" className="font-bold text-primary-950 cursor-pointer block">
                      Pay Session Fee in Advance (Razorpay Test Mode)
                    </label>
                    <p className="text-primary-700/80 mt-0.5">
                      Receive an instant tax-compliant PDF invoice & lock your confirmed slot with priority intake.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {booking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Locking slot and confirming...</span>
                    </>
                  ) : (
                    `Confirm Booking (Slot: ${selectedSlot.formattedTime})`
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Razorpay Test Checkout Modal (Module 4) */}
        <RazorpayCheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          orderDetails={checkoutOrder}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      </div>
    </div>
  );
}
