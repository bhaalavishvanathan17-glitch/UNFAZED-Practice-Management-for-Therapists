const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const schedulingRoutes = require('./routes/schedulingRoutes');
const clientRoutes = require('./routes/clientRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const packageRoutes = require('./routes/packageRoutes');
const noteRoutes = require('./routes/noteRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

/**
 * app.js — Express Application Configuration
 */
const app = express();

// ─── Core Middleware ──────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// CORS — Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Health Check Route ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'UNFAZED API is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api', schedulingRoutes); // Mounts /api/availability and /api/sessions
app.use('/api/clients', clientRoutes); // Mounts Client CRM endpoints
app.use('/api/payments', paymentRoutes); // Mounts Razorpay payments & invoicing
app.use('/api/packages', packageRoutes); // Mounts Multi-session packages
app.use('/api/notes', noteRoutes); // Mounts Module 5 Clinical Documentation
app.use('/api', communicationRoutes); // Mounts /api/conversations, /api/notifications, /api/client-portal
app.use('/api/subscriptions', subscriptionRoutes); // Mounts Module 7 Subscription management
app.use('/api/analytics', analyticsRoutes); // Mounts Module 7 Analytics & Entitlements dashboard

// ─── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;
