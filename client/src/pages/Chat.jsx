import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import {
  format,
  isToday,
  isYesterday,
  isSameDay,
} from "date-fns";
import toast from "react-hot-toast";

import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import TypingIndicator from "../components/chat/TypingIndicator";
import Avatar from "../components/ui/Avatar";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonText } from "../components/ui/Skeleton";

const PAGE_LIMIT = 30;
const NEAR_BOTTOM_PX = 120;

function dateLabel(d) {
  const date = new Date(d);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export default function Chat() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const currentUserId = user?._id;

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimers = useRef({});
  const initialLoaded = useRef(false);

  // ---- helpers ---------------------------------------------------------

  const members = room?.members || [];
  const otherCount = useMemo(() => {
    return members.filter(
      (m) => String(m.user?._id || m.user) !== String(currentUserId)
    ).length;
  }, [members, currentUserId]);

  const onlineCount = useMemo(() => {
    if (!members.length) return 0;
    return members.filter((m) => {
      const uid = String(m.user?._id || m.user);
      return uid !== String(currentUserId) && onlineUsers?.has(uid);
    }).length;
  }, [members, onlineUsers, currentUserId]);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    );
  }, []);

  const scrollToBottom = useCallback((behavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const emitRead = useCallback(() => {
    if (socket && roomId) {
      socket.emit("message:read", { roomId });
    }
  }, [socket, roomId]);

  // ---- initial data ----------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    setRoom(null);
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    initialLoaded.current = false;

    (async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/rooms/${roomId}/messages`, {
            params: { limit: PAGE_LIMIT },
          }),
        ]);
        if (cancelled) return;
        setRoom(roomRes.data.room);
        const list = msgRes.data.messages || [];
        setMessages(list);
        setHasMore(list.length >= PAGE_LIMIT);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err?.response?.data?.message || "Could not load chat"
          );
          navigate(`/room/${roomId}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, navigate]);

  // Scroll to bottom + mark read once history first lands.
  useEffect(() => {
    if (!loading && !initialLoaded.current) {
      initialLoaded.current = true;
      scrollToBottom("auto");
      emitRead();
    }
  }, [loading, scrollToBottom, emitRead]);

  // ---- socket subscription + listeners --------------------------------

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("room:subscribe", { roomId });

    const onNew = ({ message }) => {
      if (String(message.room) !== String(roomId)) return;
      const near = isNearBottom();
      const mine = String(message.sender?._id || message.sender) ===
        String(currentUserId);

      setMessages((prev) => {
        // Replace optimistic placeholder if it's my own echoed message.
        if (mine) {
          const idx = prev.findIndex(
            (m) => m.pending && m.text === message.text
          );
          if (idx !== -1) {
            const next = prev.slice();
            next[idx] = message;
            return next;
          }
        }
        if (prev.some((m) => String(m._id) === String(message._id))) {
          return prev;
        }
        return [...prev, message];
      });

      if (mine || near) {
        scrollToBottom("smooth");
      }
      // Someone else sent a message -> mark read so they see ticks.
      if (!mine) {
        emitRead();
      }
    };

    const onSeen = ({ roomId: rid, userId, messageIds }) => {
      if (String(rid) !== String(roomId)) return;
      if (String(userId) === String(currentUserId)) return;
      const idSet = new Set((messageIds || []).map(String));
      setMessages((prev) =>
        prev.map((m) => {
          if (!idSet.has(String(m._id))) return m;
          const already = (m.readBy || []).some(
            (r) => String(r.user?._id || r.user) === String(userId)
          );
          if (already) return m;
          return {
            ...m,
            readBy: [
              ...(m.readBy || []),
              { user: userId, readAt: new Date().toISOString() },
            ],
          };
        })
      );
    };

    const onTyping = ({ roomId: rid, user: tUser }) => {
      if (String(rid) !== String(roomId)) return;
      if (!tUser || String(tUser._id) === String(currentUserId)) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => String(u._id) === String(tUser._id))) return prev;
        return [...prev, tUser];
      });
      if (typingTimers.current[tUser._id]) {
        clearTimeout(typingTimers.current[tUser._id]);
      }
      typingTimers.current[tUser._id] = setTimeout(() => {
        setTypingUsers((prev) =>
          prev.filter((u) => String(u._id) !== String(tUser._id))
        );
        delete typingTimers.current[tUser._id];
      }, 4000);
    };

    const onStopTyping = ({ roomId: rid, userId }) => {
      if (String(rid) !== String(roomId)) return;
      if (typingTimers.current[userId]) {
        clearTimeout(typingTimers.current[userId]);
        delete typingTimers.current[userId];
      }
      setTypingUsers((prev) =>
        prev.filter((u) => String(u._id) !== String(userId))
      );
    };

    socket.on("message:new", onNew);
    socket.on("message:seen", onSeen);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:seen", onSeen);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      Object.values(typingTimers.current).forEach((t) => clearTimeout(t));
      typingTimers.current = {};
    };
  }, [socket, roomId, currentUserId, isNearBottom, scrollToBottom, emitRead]);

  // ---- load older on scroll-to-top ------------------------------------

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el ? el.scrollHeight : 0;

    try {
      const res = await api.get(`/rooms/${roomId}/messages`, {
        params: { before: oldest.createdAt, limit: PAGE_LIMIT },
      });
      const older = res.data.messages || [];
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      setHasMore(older.length >= PAGE_LIMIT);
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => String(m._id)));
        const merged = older.filter((m) => !existing.has(String(m._id)));
        return [...merged, ...prev];
      });
      // Preserve scroll position after prepend.
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - prevHeight;
        }
      });
    } catch (err) {
      toast.error("Could not load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, roomId]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // ---- send + typing ---------------------------------------------------

  const handleSend = useCallback(
    (text) => {
      if (!socket || !roomId) return;
      const tempId = `tmp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        room: roomId,
        text,
        createdAt: new Date().toISOString(),
        sender: {
          _id: currentUserId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          avatar: user?.avatar,
        },
        readBy: [],
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom("smooth");

      socket.emit("message:send", { roomId, text }, (ack) => {
        if (ack && ack.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? ack.message : m))
          );
        } else if (ack && ack.error) {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
          toast.error(ack.error || "Failed to send");
        }
      });
    },
    [socket, roomId, currentUserId, user, scrollToBottom]
  );

  const handleTyping = useCallback(
    (isTyping) => {
      if (!socket || !roomId) return;
      socket.emit(isTyping ? "typing" : "stop-typing", { roomId });
    },
    [socket, roomId]
  );

  // ---- grouped render --------------------------------------------------

  const grouped = useMemo(() => {
    const groups = [];
    let current = null;
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      const sameDayAsPrev =
        prev && m.createdAt && prev.createdAt
          ? isSameDay(new Date(prev.createdAt), new Date(m.createdAt))
          : false;
      if (!current || !sameDayAsPrev) {
        current = { key: `g-${i}`, date: m.createdAt, items: [] };
        groups.push(current);
      }
      const prevSameSender =
        prev &&
        String(prev.sender?._id || prev.sender) ===
          String(m.sender?._id || m.sender) &&
        sameDayAsPrev;
      current.items.push({ message: m, showSender: !prevSameSender });
    });
    return groups;
  }, [messages]);

  // ---------------------------------------------------------------------

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-3 py-2.5 backdrop-blur">
        <button
          onClick={() => navigate(`/room/${roomId}`)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          aria-label="Back to room"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-slate-900">
            {room?.name || "Chat"}
          </h1>
          <p className="text-xs text-slate-400">
            {members.length} member{members.length === 1 ? "" : "s"}
            {onlineCount > 0 && (
              <span className="ml-1 text-emerald-600">
                · {onlineCount} online
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4"
      >
        {loading ? (
          <div className="space-y-4">
            <SkeletonText lines={2} />
            <SkeletonText lines={1} />
            <SkeletonText lines={3} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              subtitle="Say hello to your group and start the conversation."
            />
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Spinner size={20} />
              </div>
            )}
            {!hasMore && (
              <div className="py-2 text-center text-xs text-slate-400">
                Beginning of conversation
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                    {dateLabel(group.date)}
                  </span>
                </div>
                {group.items.map(({ message, showSender }) => {
                  const mine =
                    String(message.sender?._id || message.sender) ===
                    String(currentUserId);
                  return (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      mine={mine}
                      currentUserId={currentUserId}
                      otherCount={otherCount}
                      showSender={showSender}
                    />
                  );
                })}
              </div>
            ))}

            <AnimatePresence>
              {typingUsers.length > 0 && (
                <div className="mt-1">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-100 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <ChatInput onSend={handleSend} onTyping={handleTyping} />
        </div>
      </div>
    </div>
  );
}
