import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, UserRoundPlus, Inbox } from "lucide-react";

import api from "../lib/api";
import { useSocket } from "../context/SocketContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonCard } from "../components/ui/Skeleton";

function fullName(user) {
  if (!user) return "Someone";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Someone";
}

export default function Requests() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState({});
  const mounted = useRef(true);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}/requests`);
      if (!mounted.current) return;
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setForbidden(false);
    } catch (err) {
      if (!mounted.current) return;
      if (err?.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Could not load join requests.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    mounted.current = true;
    fetchRequests();
    return () => {
      mounted.current = false;
    };
  }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (payload) => {
      if (!payload || String(payload.roomId) === String(roomId)) {
        fetchRequests();
      }
    };
    socket.on("request:new", onNew);
    return () => {
      socket.off("request:new", onNew);
    };
  }, [socket, roomId, fetchRequests]);

  const handleAction = async (reqId, action) => {
    setActing((prev) => ({ ...prev, [reqId]: action }));
    const previous = requests;
    // Optimistically remove the row.
    setRequests((prev) => prev.filter((r) => String(r._id) !== String(reqId)));
    try {
      await api.post(`/rooms/${roomId}/requests/${reqId}`, { action });
      toast.success(action === "accept" ? "Member added" : "Request declined");
    } catch (err) {
      if (mounted.current) setRequests(previous);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Action failed. Please try again.";
      toast.error(msg);
    } finally {
      if (mounted.current) {
        setActing((prev) => {
          const next = { ...prev };
          delete next[reqId];
          return next;
        });
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <button
        type="button"
        onClick={() => navigate(`/room/${roomId}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back to room
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-600/30">
          <UserRoundPlus size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Join Requests
          </h1>
          <p className="text-sm text-slate-500">
            Approve or decline people who want to join.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : forbidden ? (
        <EmptyState
          icon={UserRoundPlus}
          title="Admins only"
          subtitle="Only the room admin can review join requests."
          action={
            <Button onClick={() => navigate(`/room/${roomId}`)}>
              Back to room
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No pending requests"
          subtitle="When someone asks to join with the room code, they'll show up here."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {requests.map((req) => {
              const busy = Boolean(acting[req._id]);
              return (
                <motion.div
                  key={req._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                >
                  <Card className="flex items-center gap-3 p-4">
                    <Avatar user={req.user} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {fullName(req.user)}
                      </p>
                      {req.user?.email && (
                        <p className="truncate text-xs text-slate-500">
                          {req.user.email}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        loading={acting[req._id] === "decline"}
                        onClick={() => handleAction(req._id, "decline")}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        loading={acting[req._id] === "accept"}
                        onClick={() => handleAction(req._id, "accept")}
                      >
                        Accept
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
