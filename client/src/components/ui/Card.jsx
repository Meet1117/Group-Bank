import React from "react";

export function Card({ className = "", as: Comp = "div", ...rest }) {
  return (
    <Comp
      className={`rounded-2xl bg-white border border-slate-100 shadow-sm ${className}`}
      {...rest}
    />
  );
}

export default Card;
