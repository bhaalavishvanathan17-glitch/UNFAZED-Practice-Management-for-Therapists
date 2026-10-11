const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Client = require('../models/Client');
const { getIO } = require('../socket');

/**
 * @desc    Get all conversations for the authenticated therapist
 * @route   GET /api/communications/conversations
 * @access  Private (Therapist)
 */
const getConversations = async (req, res) => {
  try {
    const therapistId = req.therapist._id;

    const conversations = await Conversation.find({ therapistId })
      .populate('clientId', 'name email phone status tags')
      .sort({ lastMessageAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        conversations,
        total: conversations.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve conversations.',
    });
  }
};

/**
 * @desc    Get or create conversation with a specific client
 * @route   POST /api/communications/conversations
 * @access  Private (Therapist)
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Client ID is required.',
      });
    }

    const client = await Client.findOne({ _id: clientId, therapistId });
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found or access denied.',
      });
    }

    let conversation = await Conversation.findOne({ therapistId, clientId }).populate(
      'clientId',
      'name email phone status tags'
    );

    if (!conversation) {
      conversation = await Conversation.create({
        therapistId,
        clientId,
        lastMessage: 'Conversation opened.',
      });
      conversation = await conversation.populate('clientId', 'name email phone status tags');
    }

    return res.status(200).json({
      status: 'success',
      data: { conversation },
    });
  } catch (error) {
    console.error('Error finding/creating conversation:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to open conversation.',
    });
  }
};

/**
 * @desc    Get message history for a conversation
 * @route   GET /api/communications/conversations/:id/messages
 * @access  Private / Client
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found.',
      });
    }

    // Permission check if authenticated as therapist
    if (req.therapist && conversation.therapistId.toString() !== req.therapist._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this conversation.',
      });
    }

    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

    return res.status(200).json({
      status: 'success',
      data: {
        messages,
        total: messages.length,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve messages.',
    });
  }
};

/**
 * @desc    Send a message via HTTP fallback
 * @route   POST /api/communications/conversations/:id/messages
 * @access  Private / Client
 */
const sendMessageHttp = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, senderType = 'therapist', senderName = 'Therapist' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message content cannot be empty.',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found.',
      });
    }

    const trimmed = content.trim();
    const senderId = req.therapist ? req.therapist._id : conversation.clientId;

    const message = await Message.create({
      conversationId: id,
      senderType,
      senderId,
      senderName,
      content: trimmed,
    });

    conversation.lastMessage = trimmed.slice(0, 80);
    conversation.lastMessageAt = new Date();
    if (senderType === 'client') {
      conversation.unreadTherapist += 1;
    } else {
      conversation.unreadClient += 1;
    }
    await conversation.save();

    // Broadcast through Socket.IO if active
    const io = getIO();
    if (io) {
      io.to(`conversation:${id}`).emit('new_message', message);
    }

    return res.status(201).json({
      status: 'success',
      data: { message },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send message.',
    });
  }
};

/**
 * @desc    Client portal: Get client's conversation with their therapist
 * @route   GET /api/communications/client-portal/:clientId
 * @access  Public / Client
 */
const getClientPortalChat = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findById(clientId).populate('therapistId', 'name slug email');
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found.',
      });
    }

    let conversation = await Conversation.findOne({
      therapistId: client.therapistId._id,
      clientId: client._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        therapistId: client.therapistId._id,
        clientId: client._id,
        lastMessage: 'Conversation opened.',
      });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    return res.status(200).json({
      status: 'success',
      data: {
        conversation,
        messages,
        therapist: client.therapistId,
        client: {
          name: client.name,
          email: client.email,
        },
      },
    });
  } catch (error) {
    console.error('Error loading client portal chat:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve client chat.',
    });
  }
};

/**
 * @desc    Get therapist in-app notifications
 * @route   GET /api/notifications
 * @access  Private (Therapist)
 */
const getNotifications = async (req, res) => {
  try {
    const therapistId = req.therapist._id;

    const notifications = await Notification.find({ therapistId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ therapistId, isRead: false });

    return res.status(200).json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve notifications.',
    });
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Therapist)
 */
const markNotificationRead = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, therapistId },
      { isRead: true },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification read.',
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Therapist)
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const therapistId = req.therapist._id;

    await Notification.updateMany({ therapistId, isRead: false }, { isRead: true });

    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('Error marking all read:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update notifications.',
    });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessageHttp,
  getClientPortalChat,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
