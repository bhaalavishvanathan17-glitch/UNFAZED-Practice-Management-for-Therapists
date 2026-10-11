const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  senderType: {
    type: String,
    enum: ['therapist', 'client', 'system'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Message content cannot be empty'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
