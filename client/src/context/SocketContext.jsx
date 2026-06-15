import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setOnlineUsers(new Set());
      return;
    }

    const s = connectSocket(token);
    socketRef.current = s;
    setSocket(s);
    setConnected(s.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handlePresence = ({ userId, online }) => {
      if (!userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) {
          next.add(String(userId));
        } else {
          next.delete(String(userId));
        }
        return next;
      });
    };

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);
    s.on("presence:update", handlePresence);

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("presence:update", handlePresence);
    };
  }, [token]);

  const value = {
    socket: socket || getSocket(),
    connected,
    onlineUsers,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}
