import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  PiggyBank,
  SplitSquareHorizontal,
  Lock,
  Check,
} from "lucide-react";
import api from "../lib/api";
import { formatMoney } from "../lib/constants";
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

export default function DepositPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("member");
  const [members, setMembers] = useState([]);

  const [note, setNote] = useState("");
  const [total, setTotal] = useState("");
  // rows keyed by user id: { checked, amount(string) }
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
  const isAdmin = role === "admin";

  const checkedIds = useMemo(
    () => members.map((u) => String(u._id)).filter((uid) => rows[uid]?.checked),
    [members, rows]
  );

  const allocatedSum = useMemo(() => {
    return round2(
      checkedIds.reduce((acc, uid) => acc + (Number(rows[uid]?.amount) || 0), 0)
    );
  }, [checkedIds, rows]);

  const totalNum = round2(total);
  const diff = round2(allocatedSum - totalNum);

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

  const splitEqually = () => {
    const t = round2(total);
    if (!t || t <= 0) {
      toast.error("Enter a total amount first");
      return;
    }
    if (checkedIds.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    const per = Math.floor((t / checkedIds.length) * 100) / 100;
    setRows((prev) => {
      const next = { ...prev };
      // `running` MUST live inside the updater: React StrictMode invokes
      // state updaters twice in dev, so a closure variable declared outside
      // would carry over and make the last contributor negative.
      let running = 0;
      checkedIds.forEach((uid, idx) => {
        const isLast = idx === checkedIds.length - 1;
        const share = isLast ? round2(t - running) : per;
        running = round2(running + share);
        next[uid] = { ...next[uid], amount: String(share) };
      });
      return next;
    });
  };

  const canSubmit =
    isAdmin &&
    checkedIds.length > 0 &&
    allocatedSum > 0 &&
    Math.abs(diff) < 0.01 &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only the admin can add deposits");
      return;
    }
    const allocations = checkedIds
      .map((uid) => ({ user: uid, amount: round2(rows[uid]?.amount) }))
      .filter((a) => a.amount > 0);

    if (allocations.length === 0) {
      toast.error("Add at least one contribution amount");
      return;
    }
    if (Math.abs(diff) >= 0.01) {
      toast.error("Allocations must add up to the total");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/rooms/${id}/transactions/deposits`, {
        note: note.trim(),
        allocations,
      });
      toast.success("Deposit added");
      navigate(`/room/${id}`);
    } catch {
      if (mountedRef.current) toast.error("Could not save deposit");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
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
          Only the room admin can record deposits.
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <PiggyBank size={22} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Add deposit
          </h1>
          <p className="text-sm text-slate-500">
            Record who contributed to the pool.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4 p-4">
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
          <Input
            label="Note (optional)"
            as="textarea"
            rows={2}
            placeholder="e.g. Initial pool from everyone"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={splitEqually}
          >
            <SplitSquareHorizontal size={16} />
            Split equally among selected
          </Button>
        </Card>

        <Card className="px-4 py-1">
          <div className="px-0 py-3 text-sm font-semibold text-slate-700">
            Contributors
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
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Live sum */}
        <Card className="flex items-center justify-between p-4">
          <div className="text-sm">
            <div className="text-slate-500">Allocated</div>
            <div className="font-display text-lg font-bold text-slate-800">
              {formatMoney(allocatedSum, currency)}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-slate-500">Total</div>
            <div className="font-display text-lg font-bold text-slate-800">
              {formatMoney(totalNum, currency)}
            </div>
          </div>
        </Card>

        {Math.abs(diff) >= 0.01 && (allocatedSum > 0 || totalNum > 0) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center text-sm font-medium ${
              diff > 0 ? "text-rose-500" : "text-amber-600"
            }`}
          >
            {diff > 0
              ? `Allocations exceed total by ${formatMoney(diff, currency)}`
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
            Save deposit
          </Button>
        </div>
      </form>
    </div>
  );
}
