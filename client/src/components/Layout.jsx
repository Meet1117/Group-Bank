import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import BottomNav from "./BottomNav";
import Avatar from "./ui/Avatar";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Chat is a full-screen view: no page padding, no bottom nav.
  const isChat = /^\/room\/[^/]+\/chat\/?$/.test(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const fullName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "";

  return (
    <div
      className={`bg-slate-50 flex flex-col ${
        isChat ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      }`}
    >
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="shrink-0" aria-label="Group Bank home">
            <Logo />
          </Link>

          <div className="flex items-center gap-1">
            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <Avatar user={user} size={34} />
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                      <Avatar user={user} size={40} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User size={18} className="text-slate-400" />
                        Profile
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={18} className="text-rose-400" />
                        Log out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main
        className={
          isChat
            ? "flex-1 min-h-0 w-full flex flex-col"
            : "flex-1 w-full mx-auto max-w-3xl px-4 pt-5 pb-28 md:pb-10"
        }
      >
        <Outlet />
      </main>

      {!isChat && <BottomNav />}
    </div>
  );
}
