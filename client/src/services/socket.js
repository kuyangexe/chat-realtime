import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  if (socket) {
    socket.disconnect();
  }

  // Gunakan host yang sama di production, atau VITE_SOCKET_URL jika diatur terpisah
  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
