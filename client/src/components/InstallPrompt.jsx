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

/**
 * Returns { platform, browser } where:
 *   platform: 'ios' | 'android' | 'desktop'
 *   browser:  'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'other'
 */
function detectEnv() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    if (/CriOS/i.test(ua))  return { platform: "ios", browser: "chrome" };
    if (/FxiOS/i.test(ua))  return { platform: "ios", browser: "firefox" };
    if (/EdgiOS/i.test(ua)) return { platform: "ios", browser: "edge" };
    if (/OPiOS/i.test(ua))  return { platform: "ios", browser: "opera" };
    return { platform: "ios", browser: "safari" };
  }

  const platform = isAndroid ? "android" : "desktop";
  if (/SamsungBrowser/i.test(ua)) return { platform, browser: "samsung" };
  if (/Firefox/i.test(ua))        return { platform, browser: "firefox" };
  if (/Edg\//i.test(ua))          return { platform, browser: "edge" };
  if (/OPR\//i.test(ua))          return { platform, browser: "opera" };
  if (/Chrome/i.test(ua))         return { platform, browser: "chrome" };
  return { platform, browser: "other" };
}

// Per-browser instructions for iOS (no JS install API on iOS).
const IOS_STEPS = {
  safari: [
    <><Share size={12} className="mb-0.5 inline" /> Tap the <strong>Share</strong> button at the bottom of Safari</>,
    <>Scroll and tap <strong>"Add to Home Screen"</strong></>,
    <>Tap <strong>"Add"</strong> to confirm</>,
  ],
  chrome: [
    <><Share size={12} className="mb-0.5 inline" /> Tap the <strong>Share</strong> button in Chrome's address bar</>,
    <>Tap <strong>"Add to Home Screen"</strong></>,
    <>Tap <strong>"Add"</strong> to confirm</>,
  ],
  firefox: [
    <>Tap the <strong>menu (≡)</strong> at the bottom right</>,
    <>Tap <strong>"Add to Shortcuts"</strong></>,
    <>Tap <strong>"Add"</strong> to confirm</>,
  ],
  edge: [
    <>Tap the <strong>menu (⋯)</strong> at the bottom</>,
    <>Tap <strong>"Add to Phone"</strong></>,
    <>Tap <strong>"Add"</strong> to confirm</>,
  ],
  opera: [
    <>Tap the <strong>Opera menu (O)</strong> at the bottom</>,
    <>Tap <strong>"Home screen"</strong></>,
    <>Tap <strong>"Add"</strong> to confirm</>,
  ],
};

const BROWSER_LABELS = {
  safari:  "Safari",
  chrome:  "Chrome",
  firefox: "Firefox",
  edge:    "Edge",
  opera:   "Opera",
};

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [env, setEnv] = useState(null);
  const deferredPromptRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const detected = detectEnv();
    setEnv(detected);

    if (detected.platform === "ios") {
      // iOS: always manual instructions (no JS install API)
      timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
      return () => clearTimeout(timerRef.current);
    }

    // Android / desktop: wait for the browser's beforeinstallprompt event.
    // Firefox desktop/Android doesn't fire this — skip silently.
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

  if (!env) return null;

  const isIOS = env.platform === "ios";
  const steps = IOS_STEPS[env.browser] || IOS_STEPS.safari;
  const browserLabel = BROWSER_LABELS[env.browser] || "your browser";
  // "other" iOS browser we don't have exact steps for
  const isUnknownIOS = isIOS && !IOS_STEPS[env.browser];

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
          {/* Dismiss */}
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
            and a full-screen experience.
          </p>

          {isIOS ? (
            isUnknownIOS ? (
              /* Unknown iOS browser — point them to Safari */
              <>
                <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  For the best experience, open this page in <strong>Safari</strong>, then
                  tap Share → <strong>"Add to Home Screen"</strong>.
                </div>
                <button onClick={dismiss} className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600">Got it</button>
              </>
            ) : (
              /* Known iOS browser — tailored steps */
              <>
                <div className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Steps for {browserLabel}
                </div>
                <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <button onClick={dismiss} className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600">Got it</button>
              </>
            )
          ) : (
            /* Android / Desktop — native one-tap install */
            <>
              <button
                onClick={handleInstall}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
              >
                <Download size={16} />
                Add to Home Screen
              </button>
              <button onClick={dismiss} className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600">
                Not now
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
