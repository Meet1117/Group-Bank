import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, Receipt, Lock, Check } from "lucide-react";
import api from "../lib/api";
import { CATEGORIES, formatMoney } from "../lib/constants";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import Skeleton from "../components/ui/Skeleton";

function memberName(u) {
  if (!u) return "Member";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return name || u.email || "Member";
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export default function ExpensePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("member");
  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [total, setTotal] = useState("");
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "custom"
  // rows keyed by user id: { checked, amount(string for custom) }
  const [rows, setRows] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/rooms/${id}`);
        if (!active) return;
        setRoom(data.room);
        setRole(data.role);
        setCanManage(!!data.canManage);
        const mems = (data.room.members || []).map((m) => m.user || m);
        setMembers(mems);
        const init = {};
        mems.forEach((u) => {
          init[String(u._id)] = { checked: true, amount: "" };
        });
        setRows(init);
      } catch {
        if (active) toast.error("Could not load room");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const currency = room ? room.currency : null;
  const isAdmin = canManage;
  const totalNum = round2(total);

  const checkedIds = useMemo(
    () => members.map((u) => String(u._id)).filter((uid) => rows[uid]?.checked),
    [members, rows]
  );

  // Equal split shares (computed live).
  const equalShares = useMemo(() => {
    const map = {};
    if (totalNum > 0 && checkedIds.length > 0) {
      const per = Math.floor((totalNum / checkedIds.length) * 100) / 100;
      let running = 0;
      checkedIds.forEach((uid, idx) => {
        let share = per;
        if (idx === checkedIds.length - 1) share = round2(totalNum - running);
        running = round2(running + per);
        map[uid] = share;
      });
    }
    return map;
  }, [totalNum, checkedIds]);

  const customSum = useMemo(() => {
    return round2(
      checkedIds.reduce((acc, uid) => acc + (Number(rows[uid]?.amount) || 0), 0)
    );
  }, [checkedIds, rows]);

  const effectiveSum = splitMode === "equal" ? totalNum : customSum;
  const diff = round2(effectiveSum - totalNum);

  const toggleMember = (uid) => {
    setRows((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], checked: !prev[uid]?.checked },
    }));
  };

  const setAmount = (uid, value) => {
    setRows((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], amount: value },
    }));
  };

  const canSubmit =
    isAdmin &&
    title.trim().length > 0 &&
    totalNum > 0 &&
    checkedIds.length > 0 &&
    (splitMode === "equal" || Math.abs(diff) < 0.01) &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only the admin can add expenses");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (totalNum <= 0) {
      toast.error("Enter a total amount");
      return;
    }
    if (checkedIds.length === 0) {
      toast.error("Select who shares this expense");
      return;
    }

    let splitAmong;
    if (splitMode === "equal") {
      splitAmong = checkedIds.map((uid) => ({
        user: uid,
        amount: equalShares[uid] || 0,
      }));
    } else {
      if (Math.abs(diff) >= 0.01) {
        toast.error("Custom shares must add up to the total");
        return;
      }
      splitAmong = checkedIds
        .map((uid) => ({ user: uid, amount: round2(rows[uid]?.amount) }))
        .filter((a) => a.amount > 0);
    }

    if (splitAmong.length === 0) {
      toast.error("Each participant needs a share");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/rooms/${id}/transactions/expenses`, {
        title: title.trim(),
        category,
        totalAmount: totalNum,
        splitAmong,
      });
      toast.success("Expense added");
      navigate(`/room/${id}`);
    } catch {
      if (mountedRef.current) toast.error("Could not save expense");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Lock size={26} />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-slate-800">
          Admins only
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Only the admin or a selected payer can record expenses.
        </p>
        <Button variant="secondary" className="mt-5" as={Link} to={`/room/${id}`}>
          <ArrowLeft size={16} />
          Back to room
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={() => navigate(`/room/${id}`)}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        {room ? room.name : "Room"}
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Receipt size={22} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Add expense
          </h1>
          <p className="text-sm text-slate-500">
            Pick who shares this spend so nobody&apos;s overcharged.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4 p-4">
          <Input
            label="Title"
            placeholder="e.g. Dinner at the beach shack"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Category"
            as="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Input>
          <Input
            label="Total amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </Card>

        {/* Split mode toggle */}
        <div className="relative grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: "equal", label: "Equal" },
            { key: "custom", label: "Custom" },
          ].map((m) => {
            const active = splitMode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSplitMode(m.key)}
                className={`relative z-10 h-9 rounded-xl text-sm font-semibold transition-colors ${
                  active ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="split-mode-pill"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm"
                  />
                )}
                {m.label}
              </button>
            );
          })}
        </div>

        <Card className="px-4 py-1">
          <div className="flex items-center justify-between py-3 text-sm">
            <span className="font-semibold text-slate-700">
              Who shares this?
            </span>
            <span className="text-slate-400">{checkedIds.length} selected</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((u) => {
              const uid = String(u._id);
              const row = rows[uid] || { checked: false, amount: "" };
              return (
                <li key={uid} className="flex items-center gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleMember(uid)}
                    aria-pressed={row.checked}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      row.checked
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check size={15} />
                  </button>
                  <Avatar user={u} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {memberName(u)}
                  </span>
                  {splitMode === "equal" ? (
                    <span
                      className={`w-24 text-right text-sm font-semibold ${
                        row.checked ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      {row.checked
                        ? formatMoney(equalShares[uid] || 0, currency)
                        : "—"}
                    </span>
                  ) : (
                    <div className="w-28">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        disabled={!row.checked}
                        onChange={(e) => setAmount(uid, e.target.value)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Live total check */}
        <Card className="flex items-center justify-between p-4">
          <div className="text-sm">
            <div className="text-slate-500">
              {splitMode === "equal" ? "Per-head total" : "Allocated"}
            </div>
            <div className="font-display text-lg font-bold text-slate-800">
              {formatMoney(splitMode === "equal" ? totalNum : customSum, currency)}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-slate-500">Total</div>
            <div className="font-display text-lg font-bold text-slate-800">
              {formatMoney(totalNum, currency)}
            </div>
          </div>
        </Card>

        {splitMode === "custom" &&
          Math.abs(diff) >= 0.01 &&
          (customSum > 0 || totalNum > 0) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center text-sm font-medium ${
                diff > 0 ? "text-rose-500" : "text-amber-600"
              }`}
            >
              {diff > 0
                ? `Shares exceed total by ${formatMoney(diff, currency)}`
                : `${formatMoney(Math.abs(diff), currency)} still unallocated`}
            </motion.p>
          )}

        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={submitting}
            disabled={!canSubmit}
          >
            Save expense
          </Button>
        </div>
      </form>
    </div>
  );
}
