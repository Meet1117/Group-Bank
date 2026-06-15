import React from "react";
import { motion } from "framer-motion";

export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center px-6 py-14"
    >
      {Icon && (
        <div className="mb-4 grid place-items-center h-16 w-16 rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 text-brand-500 ring-1 ring-brand-100">
          <Icon size={28} strokeWidth={1.75} />
        </div>
      )}
      {title && <h3 className="font-display text-lg font-bold text-slate-800">{title}</h3>}
      {subtitle && (
        <p className="mt-1.5 max-w-xs text-sm text-slate-500 leading-relaxed">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
