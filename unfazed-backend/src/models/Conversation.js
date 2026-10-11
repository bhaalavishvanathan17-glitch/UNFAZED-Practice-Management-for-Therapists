const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
    index: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true,
  },
  lastMessage: {
    type: String,
    default: '',
    trim: true,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  unreadTherapist: {
    type: Number,
    default: 0,
    min: 0,
  },
  unreadClient: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Ensure only one conversation exists per therapist-client pair
conversationSchema.index({ therapistId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
