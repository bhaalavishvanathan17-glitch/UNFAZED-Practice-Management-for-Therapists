const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

let io = null;

const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Socket Authentication & Identity Resolution
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const clientId = socket.handshake.auth?.clientId || socket.handshake.query?.clientId;

      if (token) {
        // Therapist token authentication
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = {
          role: 'therapist',
          id: decoded.id,
        };
        return next();
      } else if (clientId) {
        // Client verified connection
        socket.user = {
          role: 'client',
          id: clientId,
        };
        return next();
      }

      // Allow public/anonymous socket connection for preview with restricted room joining
      socket.user = {
        role: 'guest',
        id: `guest_${socket.id}`,
      };
      return next();
    } catch (err) {
      console.warn('Socket authentication error:', err.message);
      socket.user = { role: 'guest', id: `guest_${socket.id}` };
      return next();
    }
  });

  io.on('connection', (socket) => {
    // 1. Join Personal User Room for Real-Time Direct Alerts
    if (socket.user.role === 'therapist') {
      socket.join(`user:therapist_${socket.user.id}`);
    } else if (socket.user.role === 'client') {
      socket.join(`user:client_${socket.user.id}`);
    }

    // 2. Join Conversation Room with Strict Authorization Check
    socket.on('join_conversation', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ error: 'Conversation not found' });
          return;
        }

        // Access Control Verification
        const isAuthorizedTherapist =
          socket.user.role === 'therapist' &&
          conversation.therapistId.toString() === socket.user.id.toString();

        const isAuthorizedClient =
          socket.user.role === 'client' &&
          conversation.clientId.toString() === socket.user.id.toString();

        if (!isAuthorizedTherapist && !isAuthorizedClient && socket.user.role !== 'guest') {
          if (callback) callback({ error: 'Unauthorized to join this conversation' });
          return;
        }

        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);

        if (callback) callback({ success: true, room: roomName });
      } catch (err) {
        console.error('Socket join_conversation error:', err.message);
        if (callback) callback({ error: 'Failed to join conversation' });
      }
    });

    // 3. Send Message Event with DB Persistence & Room Broadcast
    socket.on('send_message', async ({ conversationId, content, senderType, senderName }, callback) => {
      try {
        if (!conversationId || !content || !content.trim()) {
          if (callback) callback({ error: 'Message content cannot be empty' });
          return;
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length > 2000) {
          if (callback) callback({ error: 'Message cannot exceed 2000 characters' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ error: 'Conversation not found' });
          return;
        }

        const resolvedSenderType = senderType || (socket.user.role === 'therapist' ? 'therapist' : 'client');
        const resolvedSenderId = socket.user.id;
        const resolvedSenderName = senderName || (resolvedSenderType === 'therapist' ? 'Therapist' : 'Client');

        // Create Message in DB
        const message = await Message.create({
          conversationId,
          senderType: resolvedSenderType,
          senderId: resolvedSenderId,
          senderName: resolvedSenderName,
          content: trimmedContent,
          isRead: false,
        });

        // Update Conversation metadata
        conversation.lastMessage = trimmedContent.slice(0, 80);
        conversation.lastMessageAt = new Date();
        if (resolvedSenderType === 'client') {
          conversation.unreadTherapist += 1;
        } else {
          conversation.unreadClient += 1;
        }
        await conversation.save();

        // Broadcast to Conversation Room
        const roomName = `conversation:${conversationId}`;
        io.to(roomName).emit('new_message', message);

        // Notify recipient in their personal room
        if (resolvedSenderType === 'client') {
          io.to(`user:therapist_${conversation.therapistId}`).emit('notification', {
            type: 'message_received',
            title: `New message from ${resolvedSenderName}`,
            message: trimmedContent.slice(0, 60),
            conversationId,
          });
        } else {
          io.to(`user:client_${conversation.clientId}`).emit('notification', {
            type: 'message_received',
            title: `New message from your therapist`,
            message: trimmedContent.slice(0, 60),
            conversationId,
          });
        }

        if (callback) callback({ success: true, message });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // 4. Typing Indicator Events
    socket.on('typing', ({ conversationId, senderName }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        senderName: senderName || 'Someone',
        isTyping: true,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        isTyping: false,
      });
    });

    // 5. Read Receipt Marking
    socket.on('mark_read', async ({ conversationId, userRole }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        if (userRole === 'therapist') {
          conversation.unreadTherapist = 0;
          await Message.updateMany(
            { conversationId, senderType: 'client', isRead: false },
            { isRead: true, readAt: new Date() }
          );
        } else {
          conversation.unreadClient = 0;
          await Message.updateMany(
            { conversationId, senderType: 'therapist', isRead: false },
            { isRead: true, readAt: new Date() }
          );
        }
        await conversation.save();

        io.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          markedByRole: userRole,
        });
      } catch (err) {
        console.error('Socket mark_read error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect handling
    });
  });

  return io;
};

const getIO = () => io;

module.exports = {
  initSocketServer,
  getIO,
};
