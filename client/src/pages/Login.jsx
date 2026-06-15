import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { Wallet, Users, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Spinner from "../components/ui/Spinner";

const FEATURES = [
  {
    icon: Wallet,
    title: "Pool money together",
    desc: "One shared bank for the whole trip. Track every rupee in and out.",
  },
  {
    icon: Receipt,
    title: "Split only what's fair",
    desc: "Pick who shares each expense — skipped a meal? You won't be charged.",
  },
  {
    icon: Users,
    title: "Everyone stays in sync",
    desc: "Live balances, chat and notifications so no one is left guessing.",
  },
  {
    icon: ShieldCheck,
    title: "Crystal-clear settle up",
    desc: "See exactly what each person contributed and spent, instantly.",
  },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [signingIn, setSigningIn] = useState(false);

  // Where to go after sign-in: back to the page they tried to open
  // (e.g. an invite link), otherwise the dashboard.
  const fromLoc = location.state?.from;
  const redirectTo = fromLoc
    ? `${fromLoc.pathname || "/"}${fromLoc.search || ""}`
    : "/";

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSuccess = async (cred) => {
    try {
      setSigningIn(true);
      await login(cred.credential);
    } catch (err) {
      const msg = err?.response?.data?.message
        ? err.response.data.message
        : err?.response
        ? "Sign in failed. Please try again."
        : "Can't reach the server. Make sure the backend is running on port 5050.";
      toast.error(msg);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-400/40 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-indigo-400/40 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-violet-300/40 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 lg:px-8 lg:py-8">
        {/* Top bar: brand on the left, quick Google login opposite it */}
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex min-h-[40px] items-center">
            {signingIn ? (
              <span className="flex items-center gap-2 text-sm font-medium text-brand-600">
                <Spinner size={18} />
                Signing in…
              </span>
            ) : (
              <GoogleLogin
                onSuccess={(cred) => handleSuccess(cred)}
                onError={() =>
                  toast.error("Google sign-in was cancelled or failed.")
                }
                type="icon"
                shape="circle"
                size="large"
              />
            )}
          </div>
        </header>

        {/* Hero + sign-in card */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10 lg:flex-row lg:gap-16">
          {/* Hero / pitch */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-xl text-center lg:text-left"
          >

          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 backdrop-blur"
          >
            <Sparkles size={14} />
            Group trips, settled fairly
          </motion.span>

          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Split trip expenses
            <span className="block bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
              without the awkward math.
            </span>
          </h1>

          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Pool money with friends into one Group Bank, log every expense, and
            choose exactly who shares each one. Everyone always knows what they
            spent.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.45 }}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3.5 text-left backdrop-blur"
                >
                  <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {f.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {f.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Sign-in glass card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="glass rounded-2xl border border-white/40 p-7 shadow-xl shadow-brand-900/5">
            <div className="mb-1 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-600/30">
                <Wallet size={26} />
              </span>
            </div>

            <h2 className="mt-4 text-center font-display text-2xl font-bold text-slate-900">
              Welcome
            </h2>
            <p className="mt-1.5 text-center text-sm text-slate-500">
              Sign in to start your Group Bank
            </p>

            <div className="mt-7 flex min-h-[44px] items-center justify-center">
              {signingIn ? (
                <div className="flex items-center gap-2 text-brand-600">
                  <Spinner size={22} />
                  <span className="text-sm font-medium">Signing you in…</span>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={(cred) => handleSuccess(cred)}
                  onError={() => toast.error("Google sign-in was cancelled or failed.")}
                  shape="pill"
                  size="large"
                  width="280"
                  text="continue_with"
                />
              )}
            </div>

            <p className="mt-7 text-center text-xs leading-relaxed text-slate-400">
              By continuing you agree to keep the group's spending honest and
              the snacks shared.
            </p>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
