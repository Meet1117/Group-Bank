import React, { useState } from "react";

function initialsOf(user) {
  if (!user) return "?";
  const f = (user.firstName || "").trim();
  const l = (user.lastName || "").trim();
  const a = f ? f[0] : "";
  const b = l ? l[0] : "";
  const combined = (a + b).toUpperCase();
  if (combined) return combined;
  const email = (user.email || "").trim();
  return email ? email[0].toUpperCase() : "?";
}

export default function Avatar({ user, size = 40, className = "" }) {
  const [errored, setErrored] = useState(false);
  const dimension = { width: size, height: size };
  const fontSize = Math.max(11, Math.round(size * 0.4));

  const showImage = user && user.avatar && !errored;

  if (showImage) {
    return (
      <img
        src={user.avatar}
        alt={user.firstName || user.email || "User"}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-white/60 shadow-sm ${className}`}
        style={dimension}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-brand-500 to-indigo-500 shadow-sm select-none ${className}`}
      style={{ ...dimension, fontSize }}
      aria-label={user ? user.firstName || user.email : "User"}
    >
      {initialsOf(user)}
    </div>
  );
}
