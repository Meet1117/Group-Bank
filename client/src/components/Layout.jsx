import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import Avatar from "./ui/Avatar";
import PullIndicator from "./PullIndicator";

const PULL_THRESHOLD = 75;  // display-px needed to trigger reload
const PULL_MAX = 92;         // max display-px (rubber-band cap)

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Chat is a full-screen view: no page padding, no bottom nav.
  const isChat = /^\/room\/[^/]+\/chat\/?$/.test(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reloading, setReloading] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (isChat) return; // no pull-to-refresh in the full-screen chat view

    const onTouchStart = (e) => {
      if (window.scrollY > 8) return; // only activate when scrolled to very top
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startY.current === null) return;
      const raw = e.touches[0].clientY - startY.current;
      if (raw <= 0) {
        pullRef.current = 0;
        setPull(0);
        if (draggingRef.current) { draggingRef.current = false; setDragging(false); }
        return;
      }
      // 0.5× damping + hard cap — feels like rubber band resistance
      const d = Math.min(raw * 0.5, PULL_MAX);
      pullRef.current = d;
      if (!draggingRef.current) { draggingRef.current = true; setDragging(true); }
      setPull(d);
      if (raw > 10) e.preventDefault(); // prevent native overscroll once pulling
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      draggingRef.current = false;
      setDragging(false);

      if (pullRef.current >= PULL_THRESHOLD) {
        // Hold at threshold for 800 ms then reload
        setReloading(true);
        pullRef.current = PULL_THRESHOLD;
        setPull(PULL_THRESHOLD);
        setTimeout(() => window.location.reload(), 800);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isChat]);

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

      {/* Pull-to-refresh indicator — sits fixed below the sticky header,
          revealed by the translateY on <main> below */}
      {!isChat && (pull > 0 || reloading) && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 right-0 z-20 flex justify-center"
          style={{ top: 64 }}
        >
          <div
            style={{
              // Slide down from behind the header as progress grows.
              // progress=0 → translateY(-44px) hidden; progress=1 → translateY(16px) visible
              transform: `translateY(${Math.min(pull / PULL_THRESHOLD, 1) * 60 - 44}px) scale(${0.6 + Math.min(pull / PULL_THRESHOLD, 1) * 0.4})`,
              opacity: Math.min((pull / PULL_THRESHOLD) * 2.5, 1),
              transition: dragging
                ? "none"
                : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
              willChange: "transform, opacity",
            }}
          >
            <PullIndicator progress={pull / PULL_THRESHOLD} reloading={reloading} />
          </div>
        </div>
      )}

      <main
        className={
          isChat
            ? "flex-1 min-h-0 w-full flex flex-col"
            : "flex-1 w-full mx-auto max-w-3xl px-4 pt-5 pb-28 md:pb-10"
        }
        style={
          !isChat
            ? {
                transform: `translateY(${pull}px)`,
                transition: dragging
                  ? "none"
                  : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                willChange: pull > 0 ? "transform" : "auto",
              }
            : undefined
        }
      >
        <Outlet />
        {!isChat && <Footer />}
      </main>

      {!isChat && <BottomNav />}
    </div>
  );
}
