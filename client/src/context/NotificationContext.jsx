import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.notifications || []).filter((n) => !n.read).length
      );
    } catch {
      // ignore fetch failures; keep existing state
    }
  }, [token]);

  // Load on mount / when auth changes.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to realtime notifications.
  useEffect(() => {
    if (!socket) return;

    const handleNew = ({ notification }) => {
      if (!notification) return;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
      if (notification.title) {
        toast.success(notification.title);
      }
    };

    socket.on("notification:new", handleNew);

    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [socket]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post("/notifications/read-all");
    } catch {
      // best-effort; refresh to reconcile
      refresh();
    }
  }, [refresh]);

  const markRead = useCallback(
    async (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await api.post(`/notifications/${id}/read`);
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const value = {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return ctx;
}
