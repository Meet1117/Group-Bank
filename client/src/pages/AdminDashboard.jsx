import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  Landmark,
  Wallet,
  Receipt,
  MessageSquare,
  Ban,
  CheckCircle2,
  Trash2,
  Search,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Crown,
  Inbox,
} from "lucide-react";
import api from "../lib/api";
import { formatMoney } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonCard } from "../components/ui/Skeleton";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "rooms", label: "Rooms" },
];

function fullName(u) {
  if (!u) return "—";
  const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return n || u.email || "Member";
}

function timeAgo(d) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
}

/* ----------------------------- Overview ------------------------------- */
function StatCard({ icon: Icon, label, value, tint = "brand" }) {
  const tints = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-500",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <Card className="p-4">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tints[tint]}`}
      >
        <Icon size={20} />
      </span>
      <div className="mt-3 font-display text-2xl font-bold text-slate-900">
        {value}
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </Card>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data.stats);
    } catch {
      toast.error("Couldn't load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="Users" value={stats.users} tint="brand" />
        <StatCard icon={Landmark} label="Rooms" value={stats.rooms} tint="brand" />
        <StatCard
          icon={Ban}
          label="Blocked users"
          value={stats.blockedUsers}
          tint="rose"
        />
        <StatCard
          icon={Receipt}
          label="Transactions"
          value={stats.transactions}
          tint="slate"
        />
        <StatCard
          icon={MessageSquare}
          label="Messages"
          value={stats.messages}
          tint="slate"
        />
        <StatCard
          icon={Wallet}
          label="Net held"
          value={formatMoney(stats.netHeld)}
          tint="emerald"
        />
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-700">
          Money across all rooms
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Combined totals (mixed currencies shown as plain numbers).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700">
              <TrendingUp size={14} /> Total pooled
            </div>
            <div className="mt-1 font-display text-lg font-bold text-emerald-700">
              {formatMoney(stats.totalPooled)}
            </div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-600">
              <TrendingDown size={14} /> Total spent
            </div>
            <div className="mt-1 font-display text-lg font-bold text-rose-600">
              {formatMoney(stats.totalSpent)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- Users -------------------------------- */
function UsersTab({ meId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: query ? { q: query } : {},
      });
      setUsers(data.users || []);
    } catch {
      toast.error("Couldn't load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleBlock = async (u) => {
    setBusyId(u._id);
    try {
      const { data } = await api.post(`/admin/users/${u._id}/block`, {
        blocked: !u.blocked,
      });
      setUsers((prev) =>
        prev.map((x) => (x._id === u._id ? { ...x, blocked: data.user.blocked } : x))
      );
      toast.success(data.user.blocked ? "User blocked" : "User unblocked");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (u) => {
    if (
      !window.confirm(
        `Delete ${fullName(u)} (${u.email})? This removes them from all rooms. This cannot be undone.`
      )
    )
      return;
    setBusyId(u._id);
    try {
      await api.delete(`/admin/users/${u._id}`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      toast.success("User deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete user");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
        <Search size={16} className="flex-none text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : users.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Users} title="No users found" subtitle="Try a different search." />
        </Card>
      ) : (
        users.map((u) => {
          const isMe = String(u._id) === String(meId);
          return (
            <Card key={u._id} className="p-3.5">
              <div className="flex items-center gap-3">
                <Avatar user={u} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {fullName(u)}
                    </span>
                    {u.isAdmin && (
                      <Badge color="brand">
                        <span className="inline-flex items-center gap-1">
                          <Crown size={11} /> Admin
                        </span>
                      </Badge>
                    )}
                    {u.blocked && <Badge color="rose">Blocked</Badge>}
                  </div>
                  <div className="truncate text-xs text-slate-500">{u.email}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {u.roomCount} {u.roomCount === 1 ? "room" : "rooms"} · joined{" "}
                    {timeAgo(u.createdAt)}
                  </div>
                </div>
              </div>

              {!u.isAdmin && !isMe && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Button
                    size="sm"
                    variant={u.blocked ? "secondary" : "danger"}
                    loading={busyId === u._id}
                    onClick={() => toggleBlock(u)}
                    fullWidth
                  >
                    {busyId !== u._id &&
                      (u.blocked ? (
                        <>
                          <CheckCircle2 size={15} /> Unblock
                        </>
                      ) : (
                        <>
                          <Ban size={15} /> Block
                        </>
                      ))}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUser(u)}
                    className="flex-none text-rose-500"
                    aria-label="Delete user"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

/* ------------------------------- Rooms -------------------------------- */
function RoomDetailModal({ roomId, open, onClose, onDeleted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    if (!open || !roomId) return;
    setData(null);
    setMessages(null);
    setLoading(true);
    api
      .get(`/admin/rooms/${roomId}`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Couldn't load room"))
      .finally(() => setLoading(false));
  }, [open, roomId]);

  const room = data?.room;
  const currency = room?.currency;
  const balances = data?.balances;

  const loadMessages = async () => {
    setLoadingMsgs(true);
    try {
      const r = await api.get(`/admin/rooms/${roomId}/messages`);
      setMessages(r.data.messages || []);
    } catch {
      toast.error("Couldn't load chat");
    } finally {
      setLoadingMsgs(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={room ? room.name : "Room"}>
      {loading || !room ? (
        <div className="flex justify-center py-10">
          <Spinner size={26} className="text-brand-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge color="slate">
              {currency ? `${currency.symbol} ${currency.code}` : "—"}
            </Badge>
            <Badge color={room.joinType === "open" ? "green" : "brand"}>
              {room.joinType === "open" ? "Open" : "Invite only"}
            </Badge>
            <span className="font-mono uppercase tracking-wide text-slate-400">
              {room.code}
            </span>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 p-4 text-white">
            <div className="text-xs text-white/80">Bank balance</div>
            <div className="font-display text-2xl font-bold">
              {formatMoney(balances?.bankBalance, currency)}
            </div>
            <div className="mt-1 text-xs text-white/80">
              Pooled {formatMoney(balances?.totalDeposited, currency)} · Spent{" "}
              {formatMoney(balances?.totalSpent, currency)}
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Members ({balances?.members?.length || 0})
            </div>
            <ul className="divide-y divide-slate-100">
              {(balances?.members || []).map((m) => (
                <li key={m.user?._id} className="flex items-center gap-3 py-2">
                  <Avatar user={m.user} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {fullName(m.user)}
                      {String(m.user?._id) === String(room.admin?._id) && (
                        <span className="ml-1.5 text-[11px] text-brand-600">
                          (admin)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      In {formatMoney(m.contributed, currency)} · Spent{" "}
                      {formatMoney(m.spent, currency)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      m.net >= 0 ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {formatMoney(m.net, currency)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Transactions */}
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Transactions ({data.transactions?.length || 0})
            </div>
            {data.transactions?.length ? (
              <ul className="space-y-1.5">
                {data.transactions.slice(0, 30).map((t) => (
                  <li
                    key={t._id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">
                        {t.type === "deposit" ? "Deposit" : t.title || "Expense"}
                      </span>
                      <span className="ml-1.5 text-xs text-slate-400">
                        {t.type === "expense" && t.category ? t.category : ""}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${
                        t.type === "deposit" ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {t.type === "deposit" ? "+" : "-"}
                      {formatMoney(t.totalAmount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No transactions.</p>
            )}
          </div>

          {/* Chat (lazy) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Chat ({data.counts?.messages || 0})
              </span>
              {messages === null && (data.counts?.messages || 0) > 0 && (
                <Button size="sm" variant="secondary" onClick={loadMessages} loading={loadingMsgs}>
                  {!loadingMsgs && "View chat"}
                </Button>
              )}
            </div>
            {messages && (
              <ul className="max-h-60 space-y-1.5 overflow-y-auto">
                {messages.map((m) => (
                  <li key={m._id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">
                      {m.sender?.firstName || "User"}:
                    </span>{" "}
                    <span className="text-slate-600">{m.text}</span>
                  </li>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-slate-400">No messages.</p>
                )}
              </ul>
            )}
          </div>

          <Button
            variant="danger"
            fullWidth
            onClick={() => onDeleted(room._id)}
          >
            <Trash2 size={18} />
            Delete this room
          </Button>
        </div>
      )}
    </Modal>
  );
}

function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/rooms");
      setRooms(data.rooms || []);
    } catch {
      toast.error("Couldn't load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteRoom = async (id) => {
    if (!window.confirm("Delete this room and ALL its data (transactions, chat)? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/rooms/${id}`);
      setRooms((prev) => prev.filter((r) => r._id !== id));
      setViewId(null);
      toast.success("Room deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete room");
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : rooms.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Inbox} title="No rooms yet" subtitle="Rooms appear here as users create them." />
        </Card>
      ) : (
        rooms.map((r) => (
          <Card key={r._id} className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-base font-bold text-white">
                {r.currency?.symbol || <Wallet size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold text-slate-900">
                  {r.name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  by {fullName(r.admin)} · {r.memberCount}{" "}
                  {r.memberCount === 1 ? "member" : "members"} · {r.transactions} txns
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  created {timeAgo(r.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Balance
                </div>
                <div className="font-display text-sm font-bold text-emerald-600">
                  {formatMoney(r.bankBalance, r.currency)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="secondary" fullWidth onClick={() => setViewId(r._id)}>
                <Eye size={15} /> View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-none text-rose-500"
                onClick={() => deleteRoom(r._id)}
                aria-label="Delete room"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))
      )}

      <RoomDetailModal
        roomId={viewId}
        open={!!viewId}
        onClose={() => setViewId(null)}
        onDeleted={deleteRoom}
      />
    </div>
  );
}

/* ----------------------------- Page shell ----------------------------- */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const meId = user?._id;

  // Guard: only the super-admin may view this page.
  if (user && !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Admin
          </h1>
          <p className="text-sm text-slate-500">Manage users, rooms & data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative mt-5 grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative z-10 h-9 rounded-xl text-sm font-semibold transition-colors ${
                active ? "text-brand-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-pill"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm"
                />
              )}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "overview" && <Overview />}
        {tab === "users" && <UsersTab meId={meId} />}
        {tab === "rooms" && <RoomsTab />}
      </div>
    </div>
  );
}
