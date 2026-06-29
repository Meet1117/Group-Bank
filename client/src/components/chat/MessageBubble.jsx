import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import Avatar from "../ui/Avatar";

/**
 * A single chat message bubble.
 * Props:
 *  - message: { _id, text, createdAt, sender:{_id,firstName,lastName,avatar}, readBy:[{user,readAt}] }
 *  - mine: bool (true if sent by current user)
 *  - currentUserId: string
 *  - otherCount: number of OTHER members in the room (for seen-by-all calc)
 *  - showSender: bool (show name+avatar for others; used for grouping)
 *  - onDelete: (messageId) => void  — only provided for mine messages
 */
export default function MessageBubble({
  message,
  mine,
  currentUserId,
  otherCount = 0,
  showSender = true,
  onDelete,
}) {
  const time = message.createdAt
    ? format(new Date(message.createdAt), "HH:mm")
    : "";

  const readers = Array.isArray(message.readBy)
    ? message.readBy.filter(
        (r) => String(r.user?._id || r.user) !== String(currentUserId)
      ).length
    : 0;
  const seenByAll = otherCount > 0 && readers >= otherCount;

  const sender = message.sender || {};
  const senderName = sender.firstName || "Member";

  // ── Delete action state ─────────────────────────────────────────────────
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pressTimer = useRef(null);
  const canDelete = mine && !!onDelete && !message.pending;

  // Long-press (mobile): 500 ms hold opens the delete menu.
  const onPressStart = () => {
    if (!canDelete) return;
    pressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };
  const onPressCancel = () => clearTimeout(pressTimer.current);

  // Close menu when user taps/clicks anywhere else.
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    document.addEventListener("touchstart", close, { once: true, passive: true });
    document.addEventListener("mousedown", close, { once: true });
    return () => {
      document.removeEventListener("touchstart", close);
      document.removeEventListener("mousedown", close);
    };
  }, [showMenu]);

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    setHovered(false);
    onDelete(message._id);
  };

  // ── Mine bubble ─────────────────────────────────────────────────────────
  if (mine) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="flex w-full justify-end"
      >
        <div className="relative flex max-w-[80%] flex-col items-end sm:max-w-[70%]">

          {/* Long-press delete menu (mobile) */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute -top-9 right-0 z-20 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-900/8"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-500 active:bg-rose-50"
                >
                  <Trash2 size={13} />
                  Delete for everyone
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bubble row — trash icon on desktop hover, bubble on right */}
          <div
            className="flex items-end gap-1.5"
            onMouseEnter={() => canDelete && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Desktop trash icon — hidden on touch screens */}
            <AnimatePresence>
              {hovered && !showMenu && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleDelete}
                  aria-label="Delete message"
                  className="mb-5 hidden h-6 w-6 items-center justify-center rounded-full text-slate-300 transition hover:text-rose-400 sm:flex"
                >
                  <Trash2 size={14} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Message bubble */}
            <div
              onTouchStart={onPressStart}
              onTouchEnd={onPressCancel}
              onTouchMove={onPressCancel}
              className="select-none rounded-2xl rounded-br-md bg-gradient-to-r from-brand-600 to-indigo-500 px-3.5 py-2.5 text-white shadow-sm"
            >
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {message.text}
              </p>
            </div>
          </div>

          {/* Timestamp + read receipt */}
          <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-slate-400">
            <span>{time}</span>
            {message.pending ? (
              <Check className="h-3.5 w-3.5 text-slate-300" />
            ) : seenByAll ? (
              <span className="flex items-center gap-0.5 text-brand-500">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="font-medium">Seen</span>
              </span>
            ) : (
              <Check className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Others' bubble ──────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="flex w-full justify-start"
    >
      <div className="flex max-w-[82%] items-end gap-2 sm:max-w-[72%]">
        <div className="w-8 shrink-0">
          {showSender ? (
            <Avatar user={sender} size={32} />
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
        <div className="flex flex-col items-start">
          {showSender && (
            <span className="mb-1 px-1 text-xs font-semibold text-brand-600">
              {senderName}
            </span>
          )}
          <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {message.text}
            </p>
          </div>
          <span className="mt-1 px-1 text-[11px] text-slate-400">{time}</span>
        </div>
      </div>
    </motion.div>
  );
}
