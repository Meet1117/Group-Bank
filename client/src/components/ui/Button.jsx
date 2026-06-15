import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Spinner from "./Spinner";

const VARIANTS = {
  primary:
    "bg-gradient-to-r from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-600/20 hover:from-brand-700 hover:to-indigo-600 focus-visible:ring-brand-500",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-brand-400",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-400",
  danger:
    "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-sm shadow-rose-500/20 hover:from-rose-600 hover:to-red-600 focus-visible:ring-rose-400",
};

const SIZES = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const SPINNER_SIZE = { sm: 16, md: 18, lg: 20 };

// Bouncy, elastic spring shared by every button press.
const TAP_SPRING = { type: "spring", stiffness: 500, damping: 15, mass: 0.6 };

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  as: Comp = "button",
  className = "",
  children,
  disabled,
  ...rest
}) {
  const isDisabled = disabled || loading;

  // Wrap whatever element we render (button, Link, …) with framer-motion so
  // every button gets a rich springy tap. Memoized so we don't recreate the
  // motion component (which would remount it) on each render.
  const MotionComp = useMemo(
    () => (typeof motion.create === "function" ? motion.create(Comp) : motion(Comp)),
    [Comp]
  );

  const classes = [
    "inline-flex items-center justify-center font-semibold rounded-2xl select-none",
    // colors only — transforms are handled by framer so they don't fight.
    "transition-colors duration-150",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:opacity-60 disabled:pointer-events-none",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const extra =
    Comp === "button" ? { type: rest.type || "button", disabled: isDisabled } : {};

  return (
    <MotionComp
      className={classes}
      whileTap={isDisabled ? undefined : { scale: 0.93 }}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      transition={TAP_SPRING}
      {...extra}
      {...rest}
    >
      {loading && <Spinner size={SPINNER_SIZE[size] || 18} className="text-current" />}
      {children}
    </MotionComp>
  );
}
