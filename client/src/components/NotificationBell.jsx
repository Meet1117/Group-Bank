import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationBell({ className = "" }) {
  const { unreadCount } = useNotifications();
  const count = unreadCount || 0;

  return (
    <Link
      to="/notifications"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      className={`relative grid place-items-center h-10 w-10 rounded-full text-slate-600 hover:bg-slate-100 transition-colors ${className}`}
    >
      <Bell size={21} strokeWidth={2} />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-bold leading-none ring-2 ring-white"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </Link>
  );
}
