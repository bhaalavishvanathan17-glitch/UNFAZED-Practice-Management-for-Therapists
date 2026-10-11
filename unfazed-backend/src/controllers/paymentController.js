const Payment = require('../models/Payment');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Session = require('../models/Session');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');
const {
  keyId,
  createOrder,
  verifySignature,
  verifyWebhookSignature,
} = require('../config/razorpay');
const { generateInvoicePdf } = require('../services/invoiceService');

// Platform processing fee rate (2.0% platform fee)
const PLATFORM_FEE_RATE = 0.02;

/**
 * @desc    Initiate advance payment order for single session or package
 * @route   POST /api/payments/order
 * @access  Public (Client booking or purchasing package)
 */
const createPaymentOrder = async (req, res) => {
  try {
    const {
      therapistSlug,
      therapistId,
      itemType, // 'single_session' or 'package'
      serviceTitle,
      durationMinutes,
      packageId,
      clientName,
      clientEmail,
      clientPhone,
      sessionId,
    } = req.body;

    if (!clientName || !clientEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Client name and email are required to create payment order.',
      });
    }

    if (!['single_session', 'package'].includes(itemType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid item type. Must be "single_session" or "package".',
      });
    }

    // 1. Resolve therapist
    let therapist = null;
    if (therapistSlug) {
      therapist = await Therapist.findOne({ slug: therapistSlug.toLowerCase().trim() });
    } else if (therapistId) {
      therapist = await Therapist.findById(therapistId);
    }

    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist profile not found.',
      });
    }

    let calculatedAmountPaise = 0;
    let finalItemTitle = '';
    let selectedPackage = null;

    // 2. Strict Server-Side Price Verification (NEVER TRUST FRONTEND PRICE)
    if (itemType === 'single_session') {
      let matchedService = null;
      if (therapist.services && therapist.services.length > 0) {
        if (serviceTitle) {
          matchedService = therapist.services.find(
            (s) => s.title.toLowerCase() === serviceTitle.toLowerCase() && s.isActive
          );
        }
        if (!matchedService && durationMinutes) {
          matchedService = therapist.services.find(
            (s) => s.durationMinutes === Number(durationMinutes) && s.isActive
          );
        }
        if (!matchedService) {
          matchedService = therapist.services[0];
        }
      }

      const priceInr = matchedService ? matchedService.priceInr : (therapist.pricing?.individualSession || 1500);
      calculatedAmountPaise = Math.round(priceInr * 100);
      finalItemTitle = matchedService ? `${matchedService.title} (${matchedService.durationMinutes}m)` : `Individual Session (${durationMinutes || 60}m)`;
    } else if (itemType === 'package') {
      if (!packageId) {
        return res.status(400).json({
          status: 'error',
          message: 'Package ID is required for package purchase.',
        });
      }

      selectedPackage = await Package.findOne({
        _id: packageId,
        therapistId: therapist._id,
        isActive: true,
      });

      if (!selectedPackage) {
        return res.status(404).json({
          status: 'error',
          message: 'Selected therapy package not found or inactive.',
        });
      }

      calculatedAmountPaise = selectedPackage.pricePaise;
      finalItemTitle = `${selectedPackage.title} (${selectedPackage.sessionCount} Sessions)`;
    }

    // Calculate platform fee and net amount in integer paise
    const platformFeePaise = Math.round(calculatedAmountPaise * PLATFORM_FEE_RATE);
    const netAmountPaise = calculatedAmountPaise - platformFeePaise;

    // Generate unique invoice reference
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Create Gateway Order
    const gatewayOrder = await createOrder({
      amountPaise: calculatedAmountPaise,
      currency: 'INR',
      receipt: invoiceNumber,
      notes: {
        therapistId: therapist._id.toString(),
        clientEmail: clientEmail.toLowerCase().trim(),
        itemType,
      },
    });

    // 4. Save Payment record in 'created' status
    const payment = await Payment.create({
      therapistId: therapist._id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.toLowerCase().trim(),
      clientPhone: clientPhone?.trim() || '',
      sessionId: sessionId || null,
      packageId: selectedPackage ? selectedPackage._id : null,
      itemType,
      itemTitle: finalItemTitle,
      amountPaise: calculatedAmountPaise,
      currency: 'INR',
      platformFeePaise,
      netAmountPaise,
      status: 'created',
      razorpayOrderId: gatewayOrder.orderId,
      invoiceNumber,
      isTestMode: true,
    });

    return res.status(201).json({
      status: 'success',
      data: {
        paymentId: payment._id,
        orderId: gatewayOrder.orderId,
        amountPaise: calculatedAmountPaise,
        amountInr: calculatedAmountPaise / 100,
        currency: 'INR',
        keyId,
        itemTitle: finalItemTitle,
        isTestMode: true,
        invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initiate payment order.',
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature & capture transaction
 * @route   POST /api/payments/verify
 * @access  Public (Client callback after Razorpay checkout)
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment verification failed: missing gateway payment parameters.',
      });
    }

    // Locate Payment record
    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { razorpayOrderId }],
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment record not found.',
      });
    }

    // Idempotency: If already captured, return immediately
    if (payment.status === 'captured') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment already verified and confirmed.',
        data: {
          payment,
          invoiceUrl: `/api/payments/${payment._id}/invoice`,
        },
      });
    }

    // Cryptographic HMAC-SHA256 signature verification
    const isValidSignature = verifySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValidSignature) {
      payment.status = 'failed';
      payment.errorMessage = 'Cryptographic signature mismatch; untrusted transaction.';
      await payment.save();

      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment signature. Verification rejected.',
      });
    }

    // Mark payment as captured
    payment.status = 'captured';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.paymentMethod = razorpayPaymentId.startsWith('pay_test') ? 'test_mode' : 'card';
    await payment.save();

    // Find or create Client in therapist's CRM roster
    let client = await Client.findOne({
      therapistId: payment.therapistId,
      email: payment.clientEmail,
    });

    if (!client) {
      client = await Client.create({
        therapistId: payment.therapistId,
        name: payment.clientName,
        email: payment.clientEmail,
        phone: payment.clientPhone,
        tags: ['Individual', 'Paid Client'],
        internalNotes: 'Client automatically added after verified payment checkout.',
        consentRecord: {
          agreed: true,
          agreedAt: new Date(),
          ipAddress: req.ip || '127.0.0.1',
          consentVersion: 'v1.0-payment-checkout',
          consentText: 'Payment authorization and clinical service agreement accepted.',
        },
      });
    }

    payment.clientId = client._id;
    await payment.save();

    // Handle Appointment Booking Linkage
    if (payment.sessionId) {
      await Session.findByIdAndUpdate(payment.sessionId, {
        paymentStatus: 'paid',
        paymentId: payment._id,
        clientId: client._id,
      });
    }

    // Handle Package Allocation & Session Credits
    if (payment.itemType === 'package' && payment.packageId) {
      const pkg = await Package.findById(payment.packageId);
      if (pkg) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (pkg.validityDays || 90));

        await ClientPackage.create({
          therapistId: payment.therapistId,
          clientId: client._id,
          packageId: pkg._id,
          paymentId: payment._id,
          packageTitle: pkg.title,
          totalSessions: pkg.sessionCount,
          usedSessions: 0,
          validityDays: pkg.validityDays,
          expiresAt: expiryDate,
          status: 'active',
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Payment verified and captured successfully.',
      data: {
        payment,
        invoiceUrl: `/api/payments/${payment._id}/invoice`,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Payment verification failed due to internal error.',
    });
  }
};

/**
 * @desc    Process Razorpay Webhooks with signature validation and idempotency
 * @route   POST /api/payments/webhook
 * @access  Public (Called by Razorpay webhook delivery server)
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const isValid = verifyWebhookSignature(req.rawBody, signature);
    if (!isValid) {
      console.warn('Razorpay webhook signature verification failed.');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature.',
      });
    }

    const event = req.body;
    const eventId = event?.id || event?.event_id;
    const eventType = event?.event;
    const payload = event?.payload?.payment?.entity;

    if (!payload || !payload.order_id) {
      // Acknowledge receipt even for unhandled events
      return res.status(200).json({ status: 'ok', message: 'No action needed.' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: payload.order_id });
    if (!payment) {
      return res.status(200).json({ status: 'ok', message: 'Payment record not found for webhook order.' });
    }

    // Idempotency: Check if this eventId was already processed
    const alreadyProcessed = payment.webhookEvents.some((e) => e.eventId === eventId);
    if (alreadyProcessed) {
      return res.status(200).json({
        status: 'ok',
        message: 'Webhook event already processed (idempotent).',
      });
    }

    // Log event to webhook history
    payment.webhookEvents.push({
      eventId: eventId || `wh_${Date.now()}`,
      eventType: eventType || 'unknown',
      receivedAt: new Date(),
      payload,
    });

    // Update payment status based on event
    if (eventType === 'payment.captured') {
      if (payment.status !== 'captured') {
        payment.status = 'captured';
        payment.razorpayPaymentId = payload.id;
        if (payment.sessionId) {
          await Session.findByIdAndUpdate(payment.sessionId, {
            paymentStatus: 'paid',
            paymentId: payment._id,
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      payment.status = 'failed';
      payment.errorMessage = payload.error_description || 'Payment failed during checkout';
    }

    await payment.save();

    return res.status(200).json({
      status: 'ok',
      message: 'Webhook processed successfully.',
    });
  } catch (error) {
    console.error('Error handling Razorpay webhook:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook.',
    });
  }
};

/**
 * @desc    Download or stream PDF invoice
 * @route   GET /api/payments/:id/invoice
 * @access  Public/Authenticated
 */
const getInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).populate('therapistId');
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found.',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${payment.invoiceNumber}.pdf"`
    );

    await generateInvoicePdf(payment, res);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        message: 'Could not generate invoice PDF.',
      });
    }
  }
};

/**
 * @desc    Get therapist payment ledger and analytics
 * @route   GET /api/payments
 * @access  Private (Therapist)
 */
const getTherapistPayments = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { status, search } = req.query;

    const query = { therapistId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { clientName: searchRegex },
        { clientEmail: searchRegex },
        { invoiceNumber: searchRegex },
        { razorpayPaymentId: searchRegex },
      ];
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 });

    // Calculate Financial Summary
    const totalGrossPaise = payments
      .filter((p) => p.status === 'captured')
      .reduce((acc, p) => acc + p.amountPaise, 0);

    const totalFeesPaise = payments
      .filter((p) => p.status === 'captured')
      .reduce((acc, p) => acc + p.platformFeePaise, 0);

    const totalNetPaise = payments
      .filter((p) => p.status === 'captured')
      .reduce((acc, p) => acc + p.netAmountPaise, 0);

    return res.status(200).json({
      status: 'success',
      data: {
        payments,
        total: payments.length,
        summary: {
          totalGrossInr: totalGrossPaise / 100,
          totalFeesInr: totalFeesPaise / 100,
          totalNetInr: totalNetPaise / 100,
          capturedCount: payments.filter((p) => p.status === 'captured').length,
          failedCount: payments.filter((p) => p.status === 'failed').length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve payments history.',
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getInvoicePdf,
  getTherapistPayments,
};
