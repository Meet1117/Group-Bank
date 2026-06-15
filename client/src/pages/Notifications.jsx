import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import * as Icons from "lucide-react";
import { Bell, CheckCheck } from "lucide-react";

import { useNotifications } from "../context/NotificationContext";
import { NOTIF_META } from "../lib/constants";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";

const FALLBACK_META = { icon: "Bell", label: "Notification" };

const ROOM_NOTIF_TYPES = new Set([
  "member_joined",
  "join_request",
  "request_accepted",
  "deposit",
  "expense",
]);
const CHAT_NOTIF_TYPES = new Set(["chat"]);

function getIcon(name) {
  const Cmp = name && Icons[name] ? Icons[name] : Bell;
  return Cmp;
}

function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function resolveTarget(notif) {
  const roomId = notif?.room?._id || notif?.room || notif?.data?.roomId;
  if (!roomId) return null;
  if (CHAT_NOTIF_TYPES.has(notif.type)) return `/room/${roomId}/chat`;
  if (notif.type === "join_request") return `/room/${roomId}/requests`;
  if (ROOM_NOTIF_TYPES.has(notif.type)) return `/room/${roomId}`;
  return `/room/${roomId}`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  const handleClick = (notif) => {
    if (!notif.read) {
      markRead(notif._id);
    }
    const target = resolveTarget(notif);
    if (target) navigate(target);
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-600/30">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Notifications
            </h1>
            <p className="text-sm text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            <CheckCheck size={16} />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          subtitle="Deposits, expenses, join requests and messages will show up here."
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {notifications.map((notif) => {
              const meta = NOTIF_META[notif.type] || FALLBACK_META;
              const Icon = getIcon(meta.icon);
              const clickable = Boolean(resolveTarget(notif));
              return (
                <motion.div
                  key={notif._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                >
                  <Card
                    as={clickable ? "button" : "div"}
                    onClick={clickable ? () => handleClick(notif) : undefined}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
                      clickable ? "hover:bg-slate-50" : ""
                    } ${
                      notif.read
                        ? ""
                        : "border-brand-100 bg-brand-50/60"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        notif.read
                          ? "bg-slate-100 text-slate-500"
                          : "bg-gradient-to-r from-brand-600 to-indigo-500 text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate text-sm font-semibold ${
                            notif.read ? "text-slate-700" : "text-slate-900"
                          }`}
                        >
                          {notif.title || meta.label}
                        </p>
                        {!notif.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="mt-0.5 text-sm leading-snug text-slate-500">
                          {notif.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {relativeTime(notif.createdAt)}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
