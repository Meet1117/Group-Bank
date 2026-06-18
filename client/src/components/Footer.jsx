import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 px-4 text-center text-xs leading-relaxed text-slate-400">
      <p>© {year} Group Bank · All rights reserved ®</p>
      <p className="mt-0.5">
        Designed &amp; developed by{" "}
        <a
          href="https://patelmeet.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline"
        >
          Meet Patel
        </a>
      </p>
    </footer>
  );
}
