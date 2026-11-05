import { io } from 'socket.io-client';

/** docs/10 §4. VITE_SOCKET_URL is the API origin (no /api); fall back to deriving it from VITE_API_URL. */
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const createSocket = (token) =>
  io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnectionDelayMax: 10000,
  });
