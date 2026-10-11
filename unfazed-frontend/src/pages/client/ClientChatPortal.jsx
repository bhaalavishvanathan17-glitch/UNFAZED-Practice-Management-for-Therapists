import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { createChatSocket } from '../../utils/socket';

export default function ClientChatPortal() {
  const { clientId } = useParams();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [therapist, setTherapist] = useState(null);
  const [client, setClient] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isTherapistTyping, setIsTherapistTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadPortalChat();
  }, [clientId]);

  const loadPortalChat = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const res = await api.get(`/api/client-portal/${clientId}`);
      const data = res.data?.data;

      setConversation(data?.conversation);
      setMessages(data?.messages || []);
      setTherapist(data?.therapist);
      setClient(data?.client);

      if (data?.conversation?._id) {
        initSocket(data.conversation._id, data.client?.name || 'Client');
      }
    } catch (err) {
      console.error('Error loading client chat portal:', err);
      setErrorMsg(err?.response?.data?.message || 'Could not load your secure message portal.');
    } finally {
      setLoading(false);
    }
  };

  const initSocket = (conversationId, clientName) => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = createChatSocket({ clientId });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      // Join conversation room
      socket.emit('join_conversation', { conversationId });
      // Mark read as client
      socket.emit('mark_read', { conversationId, userRole: 'client' });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for incoming messages
    socket.on('new_message', (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      // Mark read when client is active
      socket.emit('mark_read', { conversationId, userRole: 'client' });
    });

    // Listen for therapist typing indicator
    socket.on('user_typing', ({ isTyping }) => {
      setIsTherapistTyping(isTyping);
    });

    // Listen for read receipts
    socket.on('messages_read', ({ markedByRole }) => {
      if (markedByRole === 'therapist') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderType === 'client' ? { ...msg, isRead: true } : msg
          )
        );
      }
    });
  };

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTherapistTyping]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !conversation || sending) return;

    const trimmed = inputText.trim();
    setSending(true);

    if (socketRef.current && socketConnected) {
      socketRef.current.emit(
        'send_message',
        {
          conversationId: conversation._id,
          content: trimmed,
          senderType: 'client',
          senderName: client?.name || 'Client',
        },
        (response) => {
          setSending(false);
          if (response?.error) {
            console.error('Socket message error:', response.error);
          } else {
            setInputText('');
            socketRef.current.emit('stop_typing', { conversationId: conversation._id });
          }
        }
      );
    } else {
      // Fallback via HTTP REST
      api
        .post(`/api/conversations/${conversation._id}/messages`, {
          content: trimmed,
          senderType: 'client',
          senderName: client?.name || 'Client',
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

    if (!socketRef.current || !conversation) return;

    socketRef.current.emit('typing', {
      conversationId: conversation._id,
      senderName: client?.name || 'Client',
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', {
        conversationId: conversation._id,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              U
            </div>
            <div>
              <span className="font-bold text-sm text-surface-900 block leading-tight">
                {therapist?.name || 'Therapist Practice'}
              </span>
              <span className="text-[10px] text-surface-500 font-medium">
                Client Direct Messenger
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/portal/${clientId}/notes`}
              className="text-xs font-semibold text-surface-600 hover:text-surface-900 transition flex items-center gap-1"
            >
              <span>📝 Shared Notes</span>
            </Link>
            {therapist?.slug && (
              <a
                href={`/${therapist.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition"
              >
                Website ↗
              </a>
            )}
            <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              🔒 Confidential Channel
            </span>
          </div>
        </div>
      </header>

      {/* Main Messenger Area */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col">
        {errorMsg ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
            {errorMsg}
          </div>
        ) : loading ? (
          <div className="p-16 text-center text-xs text-surface-400">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Connecting to your secure portal...
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-surface-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
            {/* Thread Header */}
            <div className="p-4 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-sm shadow-xs">
                  {(therapist?.name || 'T').charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">
                    {therapist?.name || 'Your Therapist'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        socketConnected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>{socketConnected ? 'Live Connection Active' : 'Connecting...'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider block">
                  Logged in as
                </span>
                <span className="text-xs font-bold text-surface-800">{client?.name}</span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-surface-50/20">
              {messages.length === 0 ? (
                <div className="p-12 text-center text-xs text-surface-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mx-auto text-xl">
                    💬
                  </div>
                  <p className="font-semibold text-surface-700">Direct message your therapist</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Feel free to send questions regarding upcoming sessions, questions on shared exercises, or administrative clarifications.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isClient = msg.senderType === 'client';
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isClient
                            ? 'bg-primary-600 text-white rounded-br-xs'
                            : 'bg-white border border-surface-200 text-surface-900 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 mt-1 text-[10px] text-surface-400 px-1 ${
                          isClient ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isClient && (
                          <span
                            title={msg.isRead ? 'Seen by therapist' : 'Delivered'}
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

              {/* Therapist Typing Indicator */}
              {isTherapistTyping && (
                <div className="flex items-center gap-2 text-xs text-primary-600 italic animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary-600" />
                  <span>{therapist?.name || 'Therapist'} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
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
                  placeholder="Type your message to your therapist..."
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white py-4 text-center text-xs text-surface-400">
        <p>🔒 End-to-End Secure Healthcare Channel • UNFAZED Clinical Suite</p>
      </footer>
    </div>
  );
}
