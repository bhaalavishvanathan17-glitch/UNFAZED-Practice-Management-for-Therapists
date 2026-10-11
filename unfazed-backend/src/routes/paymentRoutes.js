const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getInvoicePdf,
  getTherapistPayments,
} = require('../controllers/paymentController');
const { protectTherapist } = require('../middleware/auth');

// Public endpoints for client checkout & callback
router.post('/order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/:id/invoice', getInvoicePdf);

// Protected endpoint for therapist payment history & analytics
router.get('/', protectTherapist, getTherapistPayments);

module.exports = router;
