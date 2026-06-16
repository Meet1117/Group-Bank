import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤩", "🤔", "😅", "😉", "🙂", "🙃", "😌", "😴",
  "😭", "😢", "😤", "😡", "🥳", "😱", "🤗", "🤭",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👌",
  "🔥", "✨", "🎉", "💯", "✅", "❌", "💰", "🍕",
  "❤️", "💜", "💙", "💚", "💛", "🧡", "💔", "⭐",
];

/**
 * Chat composer.
 * Props:
 *  - onSend(text): called with trimmed text when user sends
 *  - onTyping(isTyping): called true on keystroke, false after debounce / send
 *  - disabled: bool
 */
export default function ChatInput({ onSend, onTyping, disabled = false }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  useEffect(() => {
    autosize();
  }, [text, autosize]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // Close the emoji popover when clicking outside the composer.
  useEffect(() => {
    if (!showEmoji) return undefined;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showEmoji]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping && onTyping(false);
    }
  }, [onTyping]);

  const signalTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping && onTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1500);
  }, [onTyping, stopTyping]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value.trim()) {
      signalTyping();
    } else {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      stopTyping();
    }
  };

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
    signalTyping();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend && onSend(value);
    setText("");
    setShowEmoji(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    stopTyping();
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Emoji popover */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute bottom-full left-0 mb-2 w-72 max-w-[88vw] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10"
          >
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => addEmoji(e)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none transition hover:bg-slate-100 active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-0.5 rounded-2xl border border-slate-200 bg-white py-1 pl-1.5 pr-3 shadow-sm transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100 ${
              showEmoji ? "text-brand-600" : "text-slate-400"
            }`}
            aria-label="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            rows={1}
            disabled={disabled}
            placeholder="Type a message"
            className="block max-h-[140px] w-full resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
          />
        </div>
        <motion.button
          type="button"
          onClick={send}
          disabled={!canSend}
          whileTap={canSend ? { scale: 0.9 } : undefined}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition ${
            canSend
              ? "bg-gradient-to-r from-brand-600 to-indigo-500"
              : "cursor-not-allowed bg-slate-300"
          }`}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
}
