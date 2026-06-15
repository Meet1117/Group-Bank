import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellOff,
  LogOut,
  Mail,
  ShieldCheck,
  Info,
  Wallet,
  Receipt,
  Users,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getPushState,
  enablePush,
  disablePush,
  isPushSupported,
} from "../lib/push";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Spinner from "../components/ui/Spinner";

const ABOUT_POINTS = [
  {
    icon: Wallet,
    text: "Pool money into one shared Group Bank for your trip or event.",
  },
  {
    icon: Receipt,
    text: "Log each expense and choose exactly who shares the cost.",
  },
  {
    icon: Users,
    text: "Everyone sees live balances — what they put in and spent.",
  },
];

// Small accessible on/off switch.
function Switch({ checked, disabled, busy, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || busy}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-gradient-to-r from-brand-600 to-indigo-500"
          : "bg-slate-300"
      }`}
    >
      <motion.span
        className="absolute left-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {busy && <Spinner size={12} className="text-brand-600" />}
      </motion.span>
    </button>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  const [supported] = useState(isPushSupported());
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Read the REAL push state on mount (and persist across refreshes).
  useEffect(() => {
    let active = true;
    getPushState().then((s) => {
      if (!active) return;
      setPermission(s.permission);
      setEnabled(s.supported && s.permission === "granted" && s.subscribed);
    });
    return () => {
      active = false;
    };
  }, []);

  const blocked = permission === "denied";

  const togglePush = async () => {
    if (busy) return;
    if (!supported) {
      toast.error("Push isn't supported on this browser");
      return;
    }
    if (blocked) {
      toast.error("Notifications are blocked in your browser settings");
      return;
    }

    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.success("Push notifications turned off");
      } else {
        const ok = await enablePush();
        if (ok) {
          setEnabled(true);
          setPermission("granted");
          toast.success("Push notifications enabled");
        } else {
          const p =
            typeof Notification !== "undefined"
              ? Notification.permission
              : "default";
          setPermission(p);
          toast.error(
            p === "denied"
              ? "You blocked notifications. Enable them in browser settings."
              : "Couldn't enable notifications"
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const statusNote = !supported
    ? "Not available on this browser. On iPhone, add Group Bank to your Home Screen (iOS 16.4+) first."
    : blocked
    ? "Blocked in your browser settings — allow notifications for this site to turn them on."
    : enabled
    ? "On — you'll get alerts even when the app is closed."
    : "Off — turn on to get deposit, expense, request and chat alerts.";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Profile
        </h1>
      </motion.div>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mt-5"
      >
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-brand-600 to-indigo-500" />
          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end gap-4">
              <div className="rounded-full ring-4 ring-white">
                <Avatar user={user} size={72} />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="font-display text-xl font-bold text-slate-900">
                {fullName || "Group Banker"}
              </h2>
              <p className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-slate-500">
                <Mail size={14} className="flex-none" />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Notifications toggle */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-5"
      >
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </h3>

          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl ${
                enabled
                  ? "bg-brand-50 text-brand-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {enabled ? <Bell size={20} /> : <BellOff size={20} />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Push notifications
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Alerts for deposits, expenses, requests and chat.
              </p>
            </div>

            <Switch
              checked={enabled}
              disabled={!supported || blocked}
              busy={busy}
              onClick={togglePush}
            />
          </div>

          {/* Status / help line */}
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
              blocked || !supported
                ? "bg-amber-50 text-amber-700"
                : enabled
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {(blocked || !supported) && (
              <TriangleAlert size={14} className="mt-0.5 flex-none" />
            )}
            <span>{statusNote}</span>
          </div>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="mt-5"
      >
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Info size={15} />
            About Group Bank
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Group Bank is the simplest way for friends to pool money and track
            shared expenses fairly. No more awkward end-of-trip math.
          </p>
          <ul className="mt-4 space-y-3">
            {ABOUT_POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">
                    {p.text}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            <ShieldCheck size={16} className="flex-none text-emerald-600" />
            Your data stays private to your rooms and their members.
          </div>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-5"
      >
        <Button variant="danger" fullWidth onClick={logout}>
          <LogOut size={18} />
          Log out
        </Button>
      </motion.div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Group Bank · Split trips fairly
      </p>
    </div>
  );
}
