import React from "react";

const COLORS = {
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  rose: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

export default function Badge({ children, color = "brand", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        COLORS[color] || COLORS.brand
      } ${className}`}
    >
      {children}
    </span>
  );
}
