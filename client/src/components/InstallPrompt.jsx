import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share } from "lucide-react";

const STORAGE_KEY = "gb_install_dismissed";
const DELAY_MS = 4000;

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function detectIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [onIOS, setOnIOS] = useState(false);
  const deferredPromptRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ios = detectIOS();
    setOnIOS(ios);

    if (ios) {
      timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
      return () => clearTimeout(timerRef.current);
    }

    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      deferredPromptRef.current = null;
    }
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Install Group Bank"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-3xl bg-white p-4 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.22)] ring-1 ring-slate-900/8 md:bottom-6"
        >
          {/* Dismiss button */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 active:scale-95"
          >
            <X size={14} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 pr-8">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-2xl shadow-sm">
              🏦
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Group Bank</p>
              <p className="text-xs text-slate-500">Free · No App Store needed</p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Add Group Bank to your Home Screen for instant access, push notifications,
            and a full-screen app experience — on both iPhone and Android.
          </p>

          {onIOS ? (
            /* iOS: manual share-sheet instructions */
            <>
              <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                {[
                  <>Tap the <Share size={12} className="mb-0.5 inline" /> <strong>Share</strong> button in Safari's toolbar</>,
                  <>Scroll and tap <strong>"Add to Home Screen"</strong></>,
                  <>Tap <strong>"Add"</strong> to confirm</>,
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={dismiss}
                className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600"
              >
                Got it
              </button>
            </>
          ) : (
            /* Android / Chrome: one-tap native install */
            <>
              <button
                onClick={handleInstall}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
              >
                <Download size={16} />
                Add to Home Screen
              </button>
              <button
                onClick={dismiss}
                className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600"
              >
                Not now
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
