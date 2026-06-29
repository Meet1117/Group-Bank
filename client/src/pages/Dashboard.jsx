import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  LogIn,
  Wallet,
  Users,
  ChevronRight,
  PiggyBank,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { formatMoney } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import { SkeletonCard } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Overlapping member avatars (first 4) with a "+N" bubble for the rest.
function AvatarStack({ members = [], total = 0, size = 30 }) {
  const shown = Array.isArray(members) ? members.slice(0, 4) : [];
  const count = total || shown.length;
  const extra = Math.max(0, count - shown.length);

  if (shown.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Users size={14} />
        No members
      </span>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {shown.map((m) => (
          <Avatar key={m._id} user={m} size={size} className="ring-2 ring-white" />
        ))}
        {extra > 0 && (
          <span
            className="flex items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white"
            style={{ width: size, height: size }}
          >
            +{extra}
          </span>
        )}
      </div>
      <span className="ml-2.5 text-xs font-medium text-slate-500">
        {count} {count === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const loadRooms = async () => {
    try {
      const { data } = await api.get("/rooms");
      setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
    } catch {
      toast.error("Couldn't load your rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadRooms, 400);
    };
    socket.on("room:update", onUpdate);
    return () => {
      socket.off("room:update", onUpdate);
      clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const firstName = user?.firstName || "there";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <p className="text-sm font-medium text-slate-500">Welcome back</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hi {firstName} 👋
          </h1>
        </div>
        {user?.isAdmin && (
          <Link
            to="/admin"
            className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.97]"
          >
            <ShieldCheck size={16} />
            Admin
          </Link>
        )}
      </motion.div>

      {/* Primary actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mt-6 grid grid-cols-2 gap-3"
      >
        <Link
          to="/create"
          className="group flex flex-col justify-between rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 p-4 text-white shadow-sm transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Plus size={22} />
          </span>
          <div className="mt-5">
            <p className="font-display text-base font-semibold">Create Room</p>
            <p className="mt-0.5 text-xs text-white/80">Start a new bank</p>
          </div>
        </Link>

        <Link
          to="/join"
          className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 text-slate-900 shadow-sm transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <LogIn size={22} />
          </span>
          <div className="mt-5">
            <p className="font-display text-base font-semibold">Join Room</p>
            <p className="mt-0.5 text-xs text-slate-500">Use a room code</p>
          </div>
        </Link>
      </motion.div>

      {/* Rooms list */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Your Rooms
          </h2>
          {!loading && rooms.length > 0 && (
            <span className="text-sm font-medium text-slate-400">
              {rooms.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : rooms.length === 0 ? (
          <Card className="p-2">
            <EmptyState
              icon={PiggyBank}
              title="No rooms yet"
              subtitle="Create your first Group Bank or join one with a code to start tracking shared expenses."
              action={
                <Link
                  to="/create"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 px-5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Create a Room
                </Link>
              }
            />
          </Card>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {rooms.map((room) => (
              <motion.div key={room._id} variants={item}>
                <Link to={`/room/${room._id}`} className="block">
                  <Card className="p-4 transition hover:border-brand-200 hover:shadow-md active:scale-[0.99]">
                    {/* Header: icon + name + role + code */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-lg font-bold text-white">
                        {room.currency?.symbol || <Wallet size={18} />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-slate-900">
                          {room.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge color={room.role === "admin" ? "brand" : "slate"}>
                            {room.role === "admin" ? "Admin" : "Member"}
                          </Badge>
                          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                            {room.code}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={18} className="flex-none text-slate-300" />
                    </div>

                    {/* Footer: member avatars + balance */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <AvatarStack members={room.members} total={room.memberCount} />
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Balance
                        </p>
                        <p
                          className={`font-display text-base font-bold ${
                            Number(room.bankBalance) < 0
                              ? "text-rose-500"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatMoney(room.bankBalance, room.currency)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
