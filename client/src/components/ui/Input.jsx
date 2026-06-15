import React, { useId } from "react";

export default function Input({
  label,
  error,
  className = "",
  as = "input",
  children,
  id,
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;

  const base =
    "w-full rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 " +
    "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400 " +
    "disabled:opacity-60 disabled:bg-slate-50";
  const borderColor = error ? "border-rose-400 focus:ring-rose-300/60 focus:border-rose-400" : "border-slate-200";
  const sizing = as === "textarea" ? "px-3.5 py-2.5 text-sm min-h-[88px] resize-y" : "h-11 px-3.5 text-sm";
  const selectExtra = as === "select" ? "appearance-none pr-9 cursor-pointer" : "";

  const fieldClasses = [base, borderColor, sizing, selectExtra, className].filter(Boolean).join(" ");

  let field;
  if (as === "textarea") {
    field = <textarea id={fieldId} className={fieldClasses} {...rest} />;
  } else if (as === "select") {
    field = (
      <div className="relative">
        <select id={fieldId} className={fieldClasses} {...rest}>
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  } else {
    field = <input id={fieldId} className={fieldClasses} {...rest} />;
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block mb-1.5 text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      {field}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
