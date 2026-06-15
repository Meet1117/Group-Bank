import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    // Refresh auth + reconnect if a socket already exists but is disconnected.
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(url, {
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      // no-op
    }
    socket = null;
  }
}
