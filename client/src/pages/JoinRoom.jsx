import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  KeyRound,
  MailCheck,
  ArrowRight,
  Lock,
  Globe,
  Users,
  LinkIcon,
} from "lucide-react";

import api from "../lib/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";

const CODE_MAX = 12;

export default function JoinRoom() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const linkMode = !!codeParam;

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  // Link / QR mode
  const [lookupLoading, setLookupLoading] = useState(linkMode);
  const [lookupErr, setLookupErr] = useState("");
  const [preview, setPreview] = useState(null); // { room, alreadyMember }

  const doJoin = useCallback(
    async (joinCode) => {
      setSubmitting(true);
      try {
        const { data } = await api.post("/rooms/join", { code: joinCode });
        if (data?.status === "joined" && data?.room?._id) {
          toast.success("You're in the group bank");
          navigate(`/room/${data.room._id}`, { replace: true });
          return true;
        }
        if (data?.status === "requested") {
          setRequested(true);
          setSubmitting(false);
          return true;
        }
        toast.error("Unexpected response. Please try again.");
      } catch (err) {
        const status = err?.response?.status;
        toast.error(
          status === 404
            ? "No group bank found with that code."
            : err?.response?.data?.message || "Could not join. Please try again."
        );
      }
      setSubmitting(false);
      return false;
    },
    [navigate]
  );

  // Link / QR mode: look up the room, then auto-join (open) or wait (invite).
  useEffect(() => {
    if (!linkMode) return undefined;
    let active = true;
    (async () => {
      setLookupLoading(true);
      setLookupErr("");
      try {
        const { data } = await api.get(
          `/rooms/lookup/${encodeURIComponent(codeParam)}`
        );
        if (!active) return;
        if (data.alreadyMember && data.room?._id) {
          navigate(`/room/${data.room._id}`, { replace: true });
          return;
        }
        setPreview(data);
        setLookupLoading(false);
        // Open rooms: join immediately — no code entry needed.
        if (data.room?.joinType === "open") {
          doJoin(data.room.code);
        }
      } catch (err) {
        if (!active) return;
        setLookupErr(
          err?.response?.status === 404
            ? "This invite link is invalid or expired."
            : "Couldn't open this invite. Please try again."
        );
        setLookupLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [linkMode, codeParam, navigate, doJoin]);

  const handleChange = (e) => {
    const cleaned = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_MAX);
    setCode(cleaned);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Enter a room code to join.");
      return;
    }
    doJoin(trimmed);
  };

  // ---- Shared: request-sent screen --------------------------------------
  if (requested) {
    const name = preview?.room?.name;
    return (
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          <Card className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-600/30">
              <MailCheck size={30} />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Request sent to admin
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {name ? `"${name}" is invite-only. ` : "This is an invite-only group bank. "}
              The admin has been notified and will review your request. You'll get
              a notification once you're approved.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---- Link / QR mode ----------------------------------------------------
  if (linkMode) {
    if (lookupLoading) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <Spinner size={32} className="text-brand-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Opening invite…
          </p>
        </div>
      );
    }

    if (lookupErr) {
      return (
        <div className="mx-auto w-full max-w-xl px-4 pt-4">
          <Card className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <LinkIcon size={26} />
            </div>
            <h1 className="font-display text-lg font-bold text-slate-900">
              {lookupErr}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Try entering the room code manually instead.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate("/join", { replace: true })}>
                Enter code manually
              </Button>
              <Button variant="secondary" onClick={() => navigate("/")}>
                Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (preview?.room) {
      const r = preview.room;
      const isOpen = r.joinType === "open";
      return (
        <div className="mx-auto w-full max-w-xl px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <Card className="p-8 text-center">
              <div
                className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-md ${
                  isOpen
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30"
                    : "bg-gradient-to-r from-brand-600 to-indigo-500 shadow-brand-600/30"
                }`}
              >
                {isOpen ? <Globe size={30} /> : <Lock size={28} />}
              </div>

              <h1 className="font-display text-xl font-bold text-slate-900">
                {r.name}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={14} />
                {r.memberCount} {r.memberCount === 1 ? "member" : "members"}
                <span className="text-slate-300">·</span>
                {isOpen ? "Open group" : "Invite only"}
              </p>

              {isOpen ? (
                <>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                    Joining you in…
                  </p>
                  <div className="mt-5">
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2 text-brand-600">
                        <Spinner size={20} />
                        <span className="text-sm font-medium">Joining…</span>
                      </div>
                    ) : (
                      <Button fullWidth size="lg" onClick={() => doJoin(r.code)}>
                        Join {r.name}
                        <ArrowRight size={18} />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                    This group is invite-only. Send a request and the admin will
                    approve you — you'll be notified when you're in.
                  </p>
                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      fullWidth
                      size="lg"
                      loading={submitting}
                      onClick={() => doJoin(r.code)}
                    >
                      {!submitting && (
                        <>
                          <MailCheck size={18} />
                          Send join request
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/")}>
                      Not now
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      );
    }
  }

  // ---- Manual code entry (default) --------------------------------------
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-600/30">
            <KeyRound size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Join a Group Bank
            </h1>
            <p className="text-sm text-slate-500">
              Got a code from a friend? Enter it below.
            </p>
          </div>
        </div>

        <Card className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="join-code"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Room code
              </label>
              <input
                id="join-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                value={code}
                onChange={handleChange}
                placeholder="ABC123"
                className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center font-display text-2xl font-bold uppercase tracking-[0.35em] text-slate-900 placeholder:tracking-[0.35em] placeholder:text-slate-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/50"
              />
              <p className="mt-2 text-center text-xs text-slate-400">
                Codes are not case-sensitive
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={!code.trim()}
            >
              {!submitting && (
                <>
                  Join Group Bank
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
