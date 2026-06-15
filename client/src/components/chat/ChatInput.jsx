import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

/**
 * Chat composer.
 * Props:
 *  - onSend(text): called with trimmed text when user sends
 *  - onTyping(isTyping): called true on keystroke, false after debounce / send
 *  - disabled: bool
 */
export default function ChatInput({ onSend, onTyping, disabled = false }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
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

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend && onSend(value);
    setText("");
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
    <div className="flex items-end gap-2">
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          rows={1}
          disabled={disabled}
          placeholder="Type a message"
          className="block max-h-[140px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
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
  );
}
