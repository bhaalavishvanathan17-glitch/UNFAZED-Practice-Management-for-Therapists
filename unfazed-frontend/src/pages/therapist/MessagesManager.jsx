import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import TherapistLayout from '../../components/profile/TherapistLayout';
import api from '../../api/axios';
import { createChatSocket } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';

export default function MessagesManager() {
  const { therapist } = useAuth();
  const [searchParams] = useSearchParams();
  const targetClientId = searchParams.get('clientId');

  const [conversations, setConversations] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientTyping, setIsClientTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedNewClientId, setSelectedNewClientId] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection & fetch conversation list
  useEffect(() => {
    const token = localStorage.getItem('unfazed_token');
    const socket = createChatSocket({ token });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for incoming messages in real-time
    socket.on('new_message', (message) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      // Update conversation snippet in the sidebar list
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.content.slice(0, 80),
              lastMessageAt: message.createdAt || new Date().toISOString(),
              unreadTherapist:
                message.senderType === 'client' && conv._id !== activeConversation?._id
                  ? (conv.unreadTherapist || 0) + 1
                  : conv.unreadTherapist,
            };
          }
          return conv;
        })
      );
    });

    // Listen for typing indicator
    socket.on('user_typing', ({ conversationId, isTyping }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setIsClientTyping(isTyping);
      }
    });

    // Listen for read receipts
    socket.on('messages_read', ({ conversationId, markedByRole }) => {
      if (markedByRole === 'client') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.conversationId === conversationId && msg.senderType === 'therapist'
              ? { ...msg, isRead: true }
              : msg
          )
        );
      }
    });

    fetchInitialData();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle active conversation room changes & fetch its messages
  useEffect(() => {
    if (!activeConversation) return;

    fetchMessages(activeConversation._id);

    // Join room
    if (socketRef.current) {
      socketRef.current.emit('join_conversation', { conversationId: activeConversation._id });
      // Mark read
      socketRef.current.emit('mark_read', {
        conversationId: activeConversation._id,
        userRole: 'therapist',
      });
    }

    // Reset unread count locally in list
    setConversations((prev) =>
      prev.map((c) => (c._id === activeConversation._id ? { ...c, unreadTherapist: 0 } : c))
    );
  }, [activeConversation?._id]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isClientTyping]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [convRes, clientsRes] = await Promise.all([
        api.get('/api/conversations'),
        api.get('/api/clients'),
      ]);

      const convList = convRes.data?.data?.conversations || [];
      const clientList = clientsRes.data?.data?.clients || [];
      setConversations(convList);
      setClients(clientList);

      // If URL param specified a client, pick or open that conversation
      if (targetClientId) {
        const found = convList.find((c) => c.clientId?._id === targetClientId);
        if (found) {
          setActiveConversation(found);
        } else {
          // Auto create/fetch conversation for this client
          startConversationWithClient(targetClientId);
        }
      } else if (convList.length > 0) {
        setActiveConversation(convList[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/api/conversations/${conversationId}/messages`);
      setMessages(res.data?.data?.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const startConversationWithClient = async (clientId) => {
    try {
      const res = await api.post('/api/conversations', { clientId });
      const conversation = res.data?.data?.conversation;
      if (conversation) {
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conversation._id);
          return exists ? prev : [conversation, ...prev];
        });
        setActiveConversation(conversation);
        setShowNewChatModal(false);
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConversation || sending) return;

    const trimmed = inputText.trim();
    setSending(true);

    if (socketRef.current && socketConnected) {
      // Emit via socket
      socketRef.current.emit(
        'send_message',
        {
          conversationId: activeConversation._id,
          content: trimmed,
          senderType: 'therapist',
          senderName: therapist?.name || 'Therapist',
        },
        (response) => {
          setSending(false);
          if (response?.error) {
            console.error('Socket message error:', response.error);
          } else {
            setInputText('');
            // Stop typing
            socketRef.current.emit('stop_typing', { conversationId: activeConversation._id });
          }
        }
      );
    } else {
      // Fallback via HTTP REST
      api
        .post(`/api/conversations/${activeConversation._id}/messages`, {
          content: trimmed,
          senderType: 'therapist',
          senderName: therapist?.name || 'Therapist',
        })
        .then((res) => {
          setMessages((prev) => [...prev, res.data.data.message]);
          setInputText('');
        })
        .catch((err) => console.error('HTTP send error:', err))
        .finally(() => setSending(false));
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!socketRef.current || !activeConversation) return;

    // Emit typing indicator
    socketRef.current.emit('typing', {
      conversationId: activeConversation._id,
      senderName: therapist?.name || 'Therapist',
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', {
        conversationId: activeConversation._id,
      });
    }, 1500);
  };

  const handleQuickTemplate = (text) => {
    setInputText(text);
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.clientId?.name || '';
    const email = c.clientId?.email || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  return (
    <TherapistLayout>
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-surface-900 tracking-tight flex items-center gap-2">
              <span>Messages & Client Chat</span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                  socketConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {socketConnected ? 'Real-Time Connected' : 'Reconnecting...'}
              </span>
            </h1>
            <p className="text-xs text-surface-500 mt-0.5">
              Secure, multi-tenant bidirectional messaging between you and your active clients.
            </p>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>💬</span>
            <span>New Chat</span>
          </button>
        </div>

        {/* Messenger Container */}
        <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden h-[750px] flex flex-col md:flex-row">
          {/* Left Column: Conversation Directory */}
          <div className="w-full md:w-80 border-r border-surface-200 flex flex-col shrink-0 bg-surface-50/50">
            {/* Search filter */}
            <div className="p-3 border-b border-surface-200 bg-white">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-surface-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search client conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-surface-400">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading client threads...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto text-lg">
                    💬
                  </div>
                  <p className="text-xs font-semibold text-surface-600">No conversations yet</p>
                  <p className="text-[11px] text-surface-400">
                    Click "New Chat" above to initiate a conversation with a registered client.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConversation?._id === conv._id;
                  const clientName = conv.clientId?.name || 'Client';
                  const clientInitial = clientName.charAt(0).toUpperCase();
                  const unread = conv.unreadTherapist || 0;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => setActiveConversation(conv)}
                      className={`w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer ${
                        isSelected ? 'bg-primary-50/70 border-l-4 border-primary-600' : 'hover:bg-surface-100/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {clientInitial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-surface-900 truncate">{clientName}</h4>
                          <span className="text-[10px] text-surface-400 shrink-0">
                            {conv.lastMessageAt
                              ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-surface-500 truncate mb-1">
                          {conv.lastMessage || 'No messages yet.'}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-surface-200/60 text-surface-600">
                            {conv.clientId?.status || 'client'}
                          </span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 bg-primary-600 text-white text-[10px] font-bold rounded-full">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-sm">
                      {(activeConversation.clientId?.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-surface-900">
                          {activeConversation.clientId?.name || 'Client'}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-200/80 text-surface-700 font-medium capitalize">
                          {activeConversation.clientId?.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-400">
                        {activeConversation.clientId?.email || ''} • {activeConversation.clientId?.phone || ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConversation.clientId?._id && (
                      <Link
                        to={`/dashboard/clients/${activeConversation.clientId._id}`}
                        className="text-xs px-2.5 py-1.5 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 text-surface-700 font-medium transition"
                      >
                        View CRM Profile ↗
                      </Link>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-surface-50/20">
                  {messages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-surface-400 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mx-auto text-xl">
                        ✉️
                      </div>
                      <p className="font-semibold text-surface-700">Start the conversation</p>
                      <p className="text-[11px] max-w-sm mx-auto">
                        Send a message below. Messages are delivered in real time to the client portal and stored securely.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isTherapist = msg.senderType === 'therapist';
                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isTherapist ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[78%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isTherapist
                                ? 'bg-primary-600 text-white rounded-br-xs'
                                : 'bg-white border border-surface-200 text-surface-900 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          <div
                            className={`flex items-center gap-1.5 mt-1 text-[10px] text-surface-400 px-1 ${
                              isTherapist ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isTherapist && (
                              <span
                                title={msg.isRead ? 'Read by client' : 'Sent'}
                                className={msg.isRead ? 'text-primary-600 font-bold' : 'text-surface-400'}
                              >
                                {msg.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Client typing indicator banner */}
                  {isClientTyping && (
                    <div className="flex items-center gap-2 text-xs text-primary-600 italic animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-primary-600" />
                      <span>{activeConversation.clientId?.name || 'Client'} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies & templates */}
                <div className="px-4 py-2 border-t border-surface-100 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 shrink-0">
                    Quick:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate('Hi! Looking forward to our scheduled session. Let me know if you need to adjust timings.')
                    }
                    className="text-[11px] px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg whitespace-nowrap cursor-pointer transition shrink-0"
                  >
                    📅 Session Check-in
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate('Please remember to complete your intake form in your client portal before our session.')
                    }
                    className="text-[11px] px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg whitespace-nowrap cursor-pointer transition shrink-0"
                  >
                    📝 Intake Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate('I have shared new exercises and session takeaways in your secure client portal.')
                    }
                    className="text-[11px] px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg whitespace-nowrap cursor-pointer transition shrink-0"
                  >
                    📚 Shared Notes
                  </button>
                </div>

                {/* Send Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t border-surface-200 bg-white flex items-end gap-2"
                >
                  <div className="flex-1 relative">
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a clinical message (Press Enter to send, Shift+Enter for new line)..."
                      className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-primary-500 resize-none"
                    />
                    <div className="absolute right-2 bottom-2 text-[10px] text-surface-400 font-mono">
                      {inputText.length}/2000
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <span>➤</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-surface-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-surface-100 text-surface-400 flex items-center justify-center text-3xl">
                  💬
                </div>
                <h3 className="text-sm font-bold text-surface-700">Select a Conversation</h3>
                <p className="text-xs max-w-sm">
                  Choose a client from the left directory to review messaging history or start a new real-time conversation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Start New Chat with a Client */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl border border-surface-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-surface-900">Start New Client Chat</h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-surface-400 hover:text-surface-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-surface-500">
                Choose a registered client from your practice CRM to initiate a conversation thread.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Select Client
                </label>
                <select
                  value={selectedNewClientId}
                  onChange={(e) => setSelectedNewClientId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-primary-500"
                >
                  <option value="">-- Choose a client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedNewClientId}
                  onClick={() => startConversationWithClient(selectedNewClientId)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TherapistLayout>
  );
}
