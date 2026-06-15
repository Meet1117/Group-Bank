import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Trash2,
  Receipt,
  PiggyBank,
} from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Avatar from "../ui/Avatar";
import { formatMoney } from "../../lib/constants";

function userName(u) {
  if (!u) return "Someone";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return name || u.email || "Someone";
}

function relTime(iso) {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function TxRow({ tx, currency, isAdmin, onDelete }) {
  const isDeposit = tx.type === "deposit";
  const participants = Array.isArray(tx.splitAmong) ? tx.splitAmong.length : 0;
  const title =
    tx.title ||
    (isDeposit ? "Deposit" : tx.category || "Expense");

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="flex items-center gap-3 py-3"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          isDeposit
            ? "bg-emerald-50 text-emerald-600"
            : "bg-brand-50 text-brand-600"
        }`}
      >
        {isDeposit ? <ArrowDownCircle size={22} /> : <ArrowUpCircle size={22} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">
            {title}
          </span>
          {!isDeposit && tx.category && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {tx.category}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Avatar user={tx.createdBy} size={16} />
            {userName(tx.createdBy)}
          </span>
          <span>&middot;</span>
          <span>{relTime(tx.createdAt)}</span>
          {!isDeposit && participants > 0 && (
            <>
              <span>&middot;</span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} />
                {participants}
              </span>
            </>
          )}
        </div>
        {tx.note && (
          <p className="mt-1 truncate text-xs text-slate-500">{tx.note}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`text-sm font-semibold ${
            isDeposit ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {isDeposit ? "+" : "-"}
          {formatMoney(tx.totalAmount, currency)}
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete && onDelete(tx)}
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
            aria-label="Delete transaction"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </motion.li>
  );
}

/**
 * TransactionList
 * props:
 *  - transactions: array of Transaction docs (populated createdBy, allocations.user, splitAmong.user)
 *  - currency: { code, symbol, name }
 *  - isAdmin: bool
 *  - onDelete: (tx) => Promise|void   (called after confirm)
 *  - loading: bool
 */
export default function TransactionList({
  transactions,
  currency,
  isAdmin,
  onDelete,
  loading,
}) {
  const [pending, setPending] = useState(null);

  const handleAskDelete = (tx) => setPending(tx);

  const handleConfirm = async () => {
    if (!pending) return;
    const tx = pending;
    setPending(null);
    if (onDelete) await onDelete(tx);
  };

  if (loading) {
    return (
      <Card className="divide-y divide-slate-100 px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-200/80" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200/80" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/80" />
            </div>
            <div className="h-4 w-14 animate-pulse rounded bg-slate-200/80" />
          </div>
        ))}
      </Card>
    );
  }

  const list = Array.isArray(transactions) ? transactions : [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        subtitle="Deposits and expenses will show up here as they happen."
      />
    );
  }

  return (
    <>
      <Card className="px-4">
        <ul className="divide-y divide-slate-100">
          <AnimatePresence initial={false}>
            {list.map((tx) => (
              <TxRow
                key={tx._id}
                tx={tx}
                currency={currency}
                isAdmin={isAdmin}
                onDelete={handleAskDelete}
              />
            ))}
          </AnimatePresence>
        </ul>
      </Card>

      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setPending(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  {pending.type === "deposit" ? (
                    <PiggyBank size={22} />
                  ) : (
                    <Receipt size={22} />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-800">
                    Delete this transaction?
                  </h3>
                  <p className="text-sm text-slate-500">
                    {pending.title ||
                      (pending.type === "deposit" ? "Deposit" : "Expense")}{" "}
                    &middot; {formatMoney(pending.totalAmount, currency)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                This will update everyone&apos;s balances. This action can&apos;t
                be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition-all active:scale-[0.97]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
