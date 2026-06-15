import React from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  User,
} from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import { formatMoney } from "../../lib/constants";

function memberName(u) {
  if (!u) return "Member";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return name || u.email || "Member";
}

// Shared "Your numbers" detail card (used in both views).
function YourNumbers({ mine, currency }) {
  const contributed = mine ? mine.contributed : 0;
  const spent = mine ? mine.spent : 0;
  const net = mine ? mine.net : 0;
  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Your numbers</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xs text-slate-500">Contributed</div>
          <div className="mt-1 font-display text-base font-semibold text-slate-800">
            {formatMoney(contributed, currency)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xs text-slate-500">Spent</div>
          <div className="mt-1 font-display text-base font-semibold text-slate-800">
            {formatMoney(spent, currency)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xs text-slate-500">Net</div>
          <div
            className={`mt-1 font-display text-base font-semibold ${
              net >= 0 ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {formatMoney(net, currency)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">
        Net = what you put in minus your share of expenses.
      </p>
    </Card>
  );
}

/**
 * BalanceOverview
 * props:
 *  - balances: computeBalances() output { totalDeposited, totalSpent, bankBalance, members:[{user,contributed,spent,net}] }
 *  - currency: { code, symbol, name }
 *  - me: current user object { _id, ... }
 *  - view: "group" (default) | "personal"
 */
export default function BalanceOverview({ balances, currency, me, view = "group" }) {
  const data = balances || {
    totalDeposited: 0,
    totalSpent: 0,
    bankBalance: 0,
    members: [],
  };

  const members = Array.isArray(data.members) ? data.members : [];
  const myId = me && (me._id || me.id) ? String(me._id || me.id) : null;
  const mine = myId
    ? members.find((m) => m.user && String(m.user._id) === myId)
    : null;

  const myNet = mine ? mine.net : 0;
  const myContrib = mine ? mine.contributed : 0;
  const mySpent = mine ? mine.spent : 0;

  // ---- Personal view -----------------------------------------------------
  if (view === "personal") {
    const settled = Math.abs(myNet) < 0.005;
    const positive = myNet >= 0;
    const statusLabel = settled
      ? "You're all settled"
      : positive
      ? "You'll get back"
      : "You owe the pool";
    const heroGradient = settled
      ? "from-slate-600 to-slate-500"
      : positive
      ? "from-emerald-500 to-teal-500"
      : "from-rose-500 to-orange-500";

    return (
      <div className="space-y-4">
        <motion.div
          key="personal-hero"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${heroGradient} p-6 text-white shadow-lg`}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/85">
              <User size={18} />
              <span className="text-sm font-medium">{statusLabel}</span>
            </div>
            <div className="mt-2 font-display text-4xl font-bold tracking-tight">
              {formatMoney(Math.abs(myNet), currency)}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs text-white/75">
                  <ArrowDownLeft size={14} />
                  <span>You contributed</span>
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatMoney(myContrib, currency)}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs text-white/75">
                  <ArrowUpRight size={14} />
                  <span>Your spend</span>
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatMoney(mySpent, currency)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <YourNumbers mine={mine} currency={currency} />
      </div>
    );
  }

  // ---- Group view --------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Hero bank balance */}
      <motion.div
        key="group-hero"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-500 p-6 text-white shadow-lg shadow-brand-600/25"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80">
            <Wallet size={18} />
            <span className="text-sm font-medium">Bank balance</span>
          </div>
          <div className="mt-2 font-display text-4xl font-bold tracking-tight">
            {formatMoney(data.bankBalance, currency)}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-white/75">
                <ArrowDownLeft size={14} />
                <span>Total pooled</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatMoney(data.totalDeposited, currency)}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-white/75">
                <ArrowUpRight size={14} />
                <span>Total spent</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatMoney(data.totalSpent, currency)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* My numbers */}
      <YourNumbers mine={mine} currency={currency} />

      {/* Settle up */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TrendingUp size={16} className="text-brand-600" />
          Settle up
        </div>
        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            No members to settle yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => {
              const isMe = myId && m.user && String(m.user._id) === myId;
              const positive = m.net >= 0;
              return (
                <li
                  key={m.user ? m.user._id : Math.random()}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Avatar user={m.user} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {memberName(m.user)}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-normal text-brand-600">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      In {formatMoney(m.contributed, currency)} &middot; Spent{" "}
                      {formatMoney(m.spent, currency)}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      positive ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {formatMoney(m.net, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
