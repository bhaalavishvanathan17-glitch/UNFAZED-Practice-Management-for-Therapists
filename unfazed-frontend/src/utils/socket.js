import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

/**
 * Factory to create or connect a Socket.IO client instance
 * 
 * Supports authentication via:
 * - token: JWT string for therapists
 * - clientId: string identifier for verified clients in client portal
 */
export const createChatSocket = ({ token, clientId } = {}) => {
  const auth = {};
  if (token) auth.token = token;
  if (clientId) auth.clientId = clientId;

  return io(SOCKET_URL, {
    auth,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
};
