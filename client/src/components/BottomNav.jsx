import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Bell, User, MessageCircle } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

function NavItem({ to, label, Icon, end = false, badgeCount }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 h-16 text-slate-400"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="bottomnav-active"
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="absolute top-0 h-0.5 w-10 rounded-full bg-gradient-to-r from-brand-600 to-indigo-500"
            />
          )}
          <span className="relative">
            <Icon
              size={22}
              strokeWidth={isActive ? 2.4 : 2}
              className={isActive ? "text-brand-600" : "text-slate-400"}
            />
            {typeof badgeCount === "number" && badgeCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none ring-2 ring-white">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </span>
          <span
            className={`text-[11px] font-semibold ${
              isActive ? "text-brand-600" : "text-slate-400"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { unreadCount } = useNotifications();
  const count = unreadCount || 0;

  // Detect whether we're inside a room, to surface a contextual Chat button.
  const location = useLocation();
  const match = location.pathname.match(/^\/room\/([^/]+)/);
  const roomId = match ? match[1] : null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-100 bg-white/90 backdrop-blur-lg pb-safe">
      <motion.div layout className="mx-auto flex max-w-md items-stretch">
        <NavItem to="/" label="Home" Icon={Home} end />
        <NavItem to="/notifications" label="Alerts" Icon={Bell} badgeCount={count} />

        {/* Contextual Chat button — springs in/out with a bouncy, elastic effect */}
        <AnimatePresence initial={false} mode="popLayout">
          {roomId && (
            <motion.div
              key="chat-nav"
              initial={{ opacity: 0, scale: 0, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 18 }}
              transition={{ type: "spring", stiffness: 500, damping: 15, mass: 0.7 }}
              style={{ transformOrigin: "bottom center" }}
              className="flex flex-1"
            >
              <NavItem to={`/room/${roomId}/chat`} label="Chat" Icon={MessageCircle} />
            </motion.div>
          )}
        </AnimatePresence>

        <NavItem to="/profile" label="Profile" Icon={User} />
      </motion.div>
    </nav>
  );
}
