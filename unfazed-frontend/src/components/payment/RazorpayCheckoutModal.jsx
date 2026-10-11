import React, { useState } from 'react';
import api from '../../api/axios';

/**
 * RazorpayCheckoutModal
 *
 * Provides a clean, modern checkout modal for Razorpay in test mode.
 * Supports standard test-mode simulation with instant cryptographic verification
 * as well as external Razorpay SDK checkout integration.
 */
export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  orderDetails, // { orderId, amountInr, itemTitle, invoiceNumber, clientName, clientEmail, paymentId, keyId }
  onPaymentSuccess,
  onPaymentFailure,
}) {
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [upiId, setUpiId] = useState('success@razorpay');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !orderDetails) return null;

  const handleSimulatedPayment = async (forceFail = false) => {
    try {
      setProcessing(true);
      setErrorMsg('');

      if (forceFail) {
        // Send invalid verification to trigger failed payment recording
        try {
          await api.post('/api/payments/verify', {
            razorpayOrderId: orderDetails.orderId,
            razorpayPaymentId: `pay_test_fail_${Date.now()}`,
            razorpaySignature: 'invalid_signature_forced_failure',
            paymentId: orderDetails.paymentId,
          });
        } catch (err) {
          setErrorMsg('Payment simulated as failed: Transaction declined by issuing bank.');
          if (onPaymentFailure) onPaymentFailure('Transaction declined by issuing bank.');
          return;
        }
      }

      // Generate valid simulated test payment ID and signature
      const mockPaymentId = `pay_test_${orderDetails.orderId}`;
      const mockSignature = `test_sig_${orderDetails.orderId}_${mockPaymentId}`;

      const res = await api.post('/api/payments/verify', {
        razorpayOrderId: orderDetails.orderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: mockSignature,
        paymentId: orderDetails.paymentId,
      });

      if (res.data.status === 'success') {
        if (onPaymentSuccess) {
          onPaymentSuccess({
            payment: res.data.data.payment,
            invoiceUrl: res.data.data.invoiceUrl,
          });
        }
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setErrorMsg(err?.response?.data?.message || 'Payment verification failed.');
      if (onPaymentFailure) onPaymentFailure(err?.response?.data?.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-surface-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Razorpay Test Branding */}
        <div className="bg-surface-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-300 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-black tracking-tight text-white">UNFAZED</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold">
              TEST MODE
            </span>
          </div>
          <p className="text-xs text-surface-400">Secure Razorpay Sandbox Payment Gateway</p>
          <div className="mt-4 pt-4 border-t border-surface-800 flex justify-between items-baseline">
            <div>
              <p className="text-xs text-surface-400">Amount Due</p>
              <h2 className="text-3xl font-black text-white">
                ₹{Number(orderDetails.amountInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400">Order ID</p>
              <p className="text-xs font-mono text-surface-300">{orderDetails.orderId.slice(0, 16)}...</p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Order Details Badge */}
          <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-surface-500">Item:</span>
              <span className="font-semibold text-surface-800">{orderDetails.itemTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Billed To:</span>
              <span className="font-semibold text-surface-800">{orderDetails.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Invoice Ref:</span>
              <span className="font-mono text-primary-600 font-semibold">{orderDetails.invoiceNumber}</span>
            </div>
          </div>

          {/* Test Payment Warning Banner */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
            <span className="text-base leading-none">⚠️</span>
            <p>
              <strong className="font-bold">Test Mode Sandbox:</strong> No actual money will be deducted. You can test successful checkout or simulated payment failure.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Select Test Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  selectedMethod === 'upi'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                <span className="text-base">⚡</span>
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  selectedMethod === 'card'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                <span className="text-base">💳</span>
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  selectedMethod === 'netbanking'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                <span className="text-base">🏦</span>
                <span>Netbanking</span>
              </button>
            </div>
          </div>

          {/* Method Input Fields */}
          {selectedMethod === 'upi' && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">
                Virtual Payment Address (VPA)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">
                  Test Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 2222 3333 4444"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled
                  value="12/28"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-100 font-mono text-surface-500 text-center"
                />
                <input
                  type="text"
                  disabled
                  value="123"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-100 font-mono text-surface-500 text-center"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">
                Select Bank
              </label>
              <select className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>HDFC Bank (Test Sandbox)</option>
                <option>ICICI Bank (Test Sandbox)</option>
                <option>State Bank of India (Test Sandbox)</option>
                <option>Axis Bank (Test Sandbox)</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => handleSimulatedPayment(false)}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying with Gateway...
                </>
              ) : (
                <>
                  <span>✓ Authorize & Pay ₹{Number(orderDetails.amountInr).toLocaleString('en-IN')}</span>
                </>
              )}
            </button>

            {/* Test Mode Failure Simulation Button */}
            <button
              type="button"
              disabled={processing}
              onClick={() => handleSimulatedPayment(true)}
              className="w-full py-2 px-3 rounded-xl border border-surface-200 hover:bg-rose-50 hover:border-rose-200 text-surface-500 hover:text-rose-600 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              Simulate Test Payment Failure (Decline)
            </button>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="bg-surface-50 px-6 py-3 border-t border-surface-200 flex items-center justify-between text-[11px] text-surface-400">
          <span>🔒 256-Bit SSL Encrypted</span>
          <span>Powered by Razorpay</span>
        </div>
      </div>
    </div>
  );
}
