const express = require('express');
const router = express.Router();
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessageHttp,
  getClientPortalChat,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/communicationController');
const { protectTherapist } = require('../middleware/auth');

// ─── CLIENT PORTAL CHAT ───────────────────────────────────────────
router.get('/client-portal/:clientId', getClientPortalChat);

// ─── CONVERSATIONS & MESSAGING (Protected Therapist) ──────────────
router.get('/conversations', protectTherapist, getConversations);
router.post('/conversations', protectTherapist, getOrCreateConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessageHttp);

// ─── IN-APP NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', protectTherapist, getNotifications);
router.patch('/notifications/:id/read', protectTherapist, markNotificationRead);
router.patch('/notifications/read-all', protectTherapist, markAllNotificationsRead);

module.exports = router;
