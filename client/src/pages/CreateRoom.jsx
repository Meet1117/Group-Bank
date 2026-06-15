import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, Wallet, Globe2, Lock, Check } from "lucide-react";

import api from "../lib/api";
import { CURRENCIES } from "../lib/constants";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

const JOIN_TYPES = [
  {
    value: "open",
    label: "Anyone with code",
    icon: Globe2,
    helper: "Friends who enter the room code join instantly. Best for trips where you trust everyone.",
  },
  {
    value: "invite",
    label: "Invite only",
    icon: Lock,
    helper: "People who enter the code send a request. You approve each one before they can join.",
  },
];

export default function CreateRoom() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState(CURRENCIES[0].code);
  const [joinType, setJoinType] = useState("open");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCurrency =
    CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  const activeJoin = JOIN_TYPES.find((j) => j.value === joinType) || JOIN_TYPES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please give your group bank a name.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/rooms", {
        name: trimmed,
        currency: {
          code: selectedCurrency.code,
          symbol: selectedCurrency.symbol,
          name: selectedCurrency.name,
        },
        joinType,
      });
      const room = data?.room;
      if (!room?._id) {
        throw new Error("Malformed response");
      }
      toast.success("Group bank created");
      navigate(`/room/${room._id}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not create the room. Please try again.";
      toast.error(msg);
      setSubmitting(false);
    }
  };

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
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Create a Group Bank
            </h1>
            <p className="text-sm text-slate-500">
              Pool money with friends and track every shared expense.
            </p>
          </div>
        </div>

        <Card className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Group name"
              placeholder="Goa Trip 2026"
              value={name}
              maxLength={60}
              error={error}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
            />

            <Input
              as="select"
              label="Currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </Input>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Who can join?
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                {JOIN_TYPES.map((opt) => {
                  const Icon = opt.icon;
                  const active = joinType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setJoinType(opt.value)}
                      className="relative flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors"
                    >
                      {active && (
                        <motion.span
                          layoutId="createroom-jointype-pill"
                          className="absolute inset-0 rounded-xl bg-white shadow-sm"
                          transition={{ type: "spring", stiffness: 360, damping: 30 }}
                        />
                      )}
                      <span
                        className={`relative z-10 flex items-center gap-2 ${
                          active ? "text-brand-700" : "text-slate-500"
                        }`}
                      >
                        <Icon size={16} />
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <motion.p
                key={activeJoin.value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"
              >
                <Check size={14} className="mt-0.5 shrink-0 text-brand-500" />
                {activeJoin.helper}
              </motion.p>
            </div>

            <Button type="submit" fullWidth size="lg" loading={submitting}>
              {submitting ? "Creating..." : "Create Group Bank"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
