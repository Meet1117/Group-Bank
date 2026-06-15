import React from "react";
import { Landmark } from "lucide-react";

export default function Logo({ showText = true, size = 36, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="grid place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-600/30"
        style={{ width: size, height: size }}
      >
        <Landmark size={Math.round(size * 0.56)} strokeWidth={2.25} />
      </span>
      {showText && (
        <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
          Group <span className="text-brand-600">Bank</span>
        </span>
      )}
    </div>
  );
}
