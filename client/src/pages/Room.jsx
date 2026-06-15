import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Copy,
  Check,
  Share2,
  MessageCircle,
  PiggyBank,
  Receipt,
  ArrowLeft,
  Inbox,
  Plus,
  Wallet,
  Users,
  User,
  Settings,
  LogOut,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { formatMoney, CURRENCIES } from "../lib/constants";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Skeleton, { SkeletonCard } from "../components/ui/Skeleton";
import Badge from "../components/ui/Badge";
import BalanceOverview from "../components/bank/BalanceOverview";
import TransactionList from "../components/bank/TransactionList";
import MemberList from "../components/bank/MemberList";
import Modal from "../components/ui/Modal";
import { QRCodeSVG } from "qrcode.react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "members", label: "Members" },
];

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("member");
  const [balances, setBalances] = useState(null);
  const [counts, setCounts] = useState({ transactions: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);

  const [tab, setTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("group");
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJoinType, setEditJoinType] = useState("open");
  const [editCurrencyCode, setEditCurrencyCode] = useState("INR");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isAdmin = role === "admin";
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${id}`);
      if (!mountedRef.current) return;
      setRoom(data.room);
      setRole(data.role);
      setBalances(data.balances);
      setCounts(data.counts || { transactions: 0, pendingRequests: 0 });
      setError("");
    } catch (err) {
      if (!mountedRef.current) return;
      const status = err?.response?.status;
      if (status === 403) setError("You are not a member of this room.");
      else if (status === 404) setError("Room not found.");
      else setError("Could not load this room.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { data } = await api.get(`/rooms/${id}/transactions`);
      if (!mountedRef.current) return;
      setTransactions(data.transactions || []);
      setTxLoaded(true);
    } catch {
      if (mountedRef.current) toast.error("Could not load transactions.");
    } finally {
      if (mountedRef.current) setTxLoading(false);
    }
  }, [id]);

  // Initial load.
  useEffect(() => {
    setLoading(true);
    setTxLoaded(false);
    fetchRoom();
  }, [fetchRoom]);

  // Lazy-load transactions when History tab is first opened.
  useEffect(() => {
    if (tab === "history" && !txLoaded && !txLoading) {
      fetchTransactions();
    }
  }, [tab, txLoaded, txLoading, fetchTransactions]);

  // Socket: refetch on room:update for this room.
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (payload) => {
      if (!payload || String(payload.roomId) === String(id)) {
        fetchRoom();
        if (txLoaded) fetchTransactions();
      }
    };
    socket.emit("room:subscribe", { roomId: id });
    socket.on("room:update", onUpdate);
    return () => {
      socket.off("room:update", onUpdate);
    };
  }, [socket, id, fetchRoom, fetchTransactions, txLoaded]);

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success("Room code copied");
      setTimeout(() => mountedRef.current && setCopied(false), 1600);
    } catch {
      toast.error("Could not copy code");
    }
  };

  const buildJoinUrl = () =>
    room ? `${window.location.origin}/join/${room.code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildJoinUrl());
      setLinkCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => mountedRef.current && setLinkCopied(false), 1600);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const shareLink = async () => {
    if (!room) return;
    const url = buildJoinUrl();
    const shareData = {
      title: `Join "${room.name}" on Group Bank`,
      text:
        room.joinType === "open"
          ? `Join my Group Bank "${room.name}" — tap to hop in:`
          : `Request to join my Group Bank "${room.name}":`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied");
      }
    } catch {
      /* user cancelled share — ignore */
    }
  };

  const handleDeleteTx = async (tx) => {
    try {
      await api.delete(`/rooms/${id}/transactions/${tx._id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== tx._id));
      toast.success("Transaction deleted");
      fetchRoom();
    } catch {
      toast.error("Could not delete transaction");
    }
  };

  const openSettings = () => {
    if (!room) return;
    setEditName(room.name || "");
    setEditJoinType(room.joinType || "open");
    setEditCurrencyCode(room.currency?.code || "INR");
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const name = editName.trim();
    if (!name) {
      toast.error("Room name can't be empty");
      return;
    }
    const cur =
      CURRENCIES.find((c) => c.code === editCurrencyCode) || room.currency;
    setSaving(true);
    try {
      const { data } = await api.patch(`/rooms/${id}`, {
        name,
        currency: { code: cur.code, symbol: cur.symbol, name: cur.name },
        joinType: editJoinType,
      });
      setRoom(data.room);
      toast.success("Room updated");
      setSettingsOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update room");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleLeave = async () => {
    const memberCount = room?.members?.length || 0;
    const isLastAdmin = isAdmin && memberCount <= 1;
    const ok = window.confirm(
      isLastAdmin
        ? "You're the only member. Leaving will permanently delete this group bank. Continue?"
        : "Leave this group bank? You'll lose access to its balances and chat."
    );
    if (!ok) return;
    setLeaving(true);
    try {
      await api.post(`/rooms/${id}/leave`);
      toast.success(isLastAdmin ? "Group deleted" : "You left the group");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not leave the group");
      if (mountedRef.current) setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Inbox size={26} />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-slate-800">
          {error}
        </h2>
        <Button
          variant="secondary"
          className="mt-5"
          as={Link}
          to="/"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Button>
      </div>
    );
  }

  const currency = room.currency;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-slate-900">
              {room.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge color="slate">
                <span className="inline-flex items-center gap-1">
                  <Wallet size={12} />
                  {currency ? `${currency.symbol} ${currency.code}` : "—"}
                </span>
              </Badge>
              <Badge color={room.joinType === "open" ? "green" : "brand"}>
                {room.joinType === "open" ? "Open" : "Invite only"}
              </Badge>
              {isAdmin && <Badge color="brand">Admin</Badge>}
            </div>
          </div>
        </div>

        {/* Room code + actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-3 py-2 font-mono text-sm font-semibold tracking-widest text-brand-700 transition-colors hover:bg-brand-100"
          >
            {room.code}
            {copied ? (
              <Check size={15} className="text-emerald-600" />
            ) : (
              <Copy size={15} />
            )}
          </button>
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 size={15} />
            Share
          </Button>

          {/* Balance view toggle: Group totals vs your personal balance */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setView("group")}
              className={`relative rounded-lg px-3 py-1.5 transition-colors ${
                view === "group" ? "text-brand-700" : "text-slate-500"
              }`}
            >
              {view === "group" && (
                <motion.span
                  layoutId="balance-view-pill"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm"
                />
              )}
              <span className="relative inline-flex items-center gap-1">
                <Users size={14} />
                Group
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("personal")}
              className={`relative rounded-lg px-3 py-1.5 transition-colors ${
                view === "personal" ? "text-brand-700" : "text-slate-500"
              }`}
            >
              {view === "personal" && (
                <motion.span
                  layoutId="balance-view-pill"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm"
                />
              )}
              <span className="relative inline-flex items-center gap-1">
                <User size={14} />
                You
              </span>
            </button>
          </div>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              as={Link}
              to={`/room/${id}/requests`}
              className="relative"
            >
              <Inbox size={15} />
              Requests
              {counts.pendingRequests > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
                  {counts.pendingRequests}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={openSettings}
            aria-label="Room settings"
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Hero balance — switches between Group totals and your personal balance */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <BalanceOverview
            balances={balances}
            currency={currency}
            me={user}
            view={view}
          />
        </motion.div>
      </AnimatePresence>

      {/* Open chat */}
      <Button
        as={Link}
        to={`/room/${id}/chat`}
        fullWidth
        className="mt-4"
        size="lg"
      >
        <MessageCircle size={18} />
        Open Chat
      </Button>

      {/* Tabs */}
      <div className="mt-5">
        <div className="relative grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
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
                    layoutId="room-tab-pill"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm"
                  />
                )}
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {tab === "overview" && (
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Transactions</div>
                        <div className="mt-1 font-display text-lg font-bold text-slate-800">
                          {counts.transactions}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Members</div>
                        <div className="mt-1 font-display text-lg font-bold text-slate-800">
                          {room.members ? room.members.length : 0}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {tab === "history" && (
                <TransactionList
                  transactions={transactions}
                  currency={currency}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteTx}
                  loading={txLoading && !txLoaded}
                />
              )}

              {tab === "members" && (
                <MemberList
                  members={room.members}
                  adminId={room.admin}
                  me={user}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Admin floating actions */}
      {isAdmin && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="pointer-events-auto flex gap-3"
          >
            <Button
              as={Link}
              to={`/room/${id}/deposit`}
              variant="secondary"
              fullWidth
              className="shadow-lg shadow-slate-900/5"
            >
              <PiggyBank size={18} />
              Deposit
            </Button>
            <Button
              as={Link}
              to={`/room/${id}/expense`}
              fullWidth
              className="shadow-lg shadow-brand-600/25"
            >
              <Plus size={18} />
              Add Expense
            </Button>
          </motion.div>
        </div>
      )}

      {/* Spacer so floating bar doesn't cover content */}
      {isAdmin && <div className="h-20" />}

      {/* Share / invite modal */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Invite to this Group Bank"
      >
        <div className="flex flex-col items-center text-center">
          <p className="max-w-xs text-sm text-slate-500">
            {room.joinType === "open"
              ? "Scan the QR or share the link — anyone with it joins instantly."
              : "Scan the QR or share the link — they'll request to join and you approve."}
          </p>

          <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <QRCodeSVG
              value={buildJoinUrl()}
              size={196}
              fgColor="#5b21b6"
              bgColor="#ffffff"
              level="M"
              marginSize={2}
            />
          </div>

          <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Room code
          </div>
          <div className="font-display text-2xl font-bold tracking-[0.3em] text-brand-700">
            {room.code}
          </div>

          <div className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-2">
            <span className="min-w-0 flex-1 truncate text-left text-sm text-slate-600">
              {buildJoinUrl()}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={copyLink}
              className="flex-none"
            >
              {linkCopied ? <Check size={15} /> : <Copy size={15} />}
              {linkCopied ? "Copied" : "Copy"}
            </Button>
          </div>

          <Button fullWidth size="lg" className="mt-3" onClick={shareLink}>
            <Share2 size={18} />
            Share link
          </Button>
        </div>
      </Modal>

      {/* Room settings modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Room settings"
      >
        <div className="space-y-4">
          {isAdmin ? (
            <>
              <Input
                label="Group name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Goa Trip"
              />

              <Input
                label="Currency"
                as="select"
                value={editCurrencyCode}
                onChange={(e) => setEditCurrencyCode(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </Input>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Who can join
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "open", label: "Anyone with code", Icon: Globe },
                    { k: "invite", label: "Invite only", Icon: Lock },
                  ].map((opt) => {
                    const active = editJoinType === opt.k;
                    return (
                      <button
                        key={opt.k}
                        type="button"
                        onClick={() => setEditJoinType(opt.k)}
                        className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition ${
                          active
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <opt.Icon size={16} className="flex-none" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button fullWidth size="lg" loading={saving} onClick={saveSettings}>
                {!saving && "Save changes"}
              </Button>

              <div className="border-t border-slate-100 pt-1" />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Only the admin can edit this group's name, currency or join mode.
            </p>
          )}

          {/* Danger zone */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-400">
              Danger zone
            </p>
            {(() => {
              const memberCount = room?.members?.length || 0;
              const adminBlocked = isAdmin && memberCount > 1;
              const isLastAdmin = isAdmin && memberCount <= 1;
              return (
                <>
                  <Button
                    variant="danger"
                    fullWidth
                    loading={leaving}
                    disabled={adminBlocked}
                    onClick={handleLeave}
                  >
                    {!leaving &&
                      (isLastAdmin ? (
                        <>
                          <Trash2 size={18} />
                          Delete group
                        </>
                      ) : (
                        <>
                          <LogOut size={18} />
                          Leave group
                        </>
                      ))}
                  </Button>
                  {adminBlocked && (
                    <p className="mt-2 text-xs text-slate-400">
                      As admin you can't leave while other members remain. Hand
                      the group over or remove members first.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
}
