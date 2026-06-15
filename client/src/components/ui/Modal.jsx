import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title || "Dialog"}
            className="relative w-full sm:max-w-lg bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden pb-safe"
            initial={{ y: window.innerWidth < 640 ? "100%" : 24, opacity: 0, scale: window.innerWidth < 640 ? 1 : 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: window.innerWidth < 640 ? "100%" : 16, opacity: 0, scale: window.innerWidth < 640 ? 1 : 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-slate-200" />
            </div>
            {(title || onClose) && (
              <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5">
                <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid place-items-center h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="px-5 pb-5 overflow-y-auto flex-1">{children}</div>
            {footer && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
