// Visual-only component: the pull-to-refresh spinner that appears below the header.
// Pull logic and positioning are managed by Layout.
export default function PullIndicator({ progress, reloading }) {
  const r = 11;
  const circ = 2 * Math.PI * r; // ≈ 69.1
  const dash = circ * Math.min(progress, 1);

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.18)] ring-1 ring-slate-900/6">
      {reloading ? (
        <svg className="animate-spin" width={24} height={24} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="3" />
          <path
            className="opacity-90"
            fill="#7c3aed"
            d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
          />
        </svg>
      ) : (
        <svg width={26} height={26} viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r={r} stroke="#e2e8f0" strokeWidth="2.5" />
          <circle
            cx="14" cy="14" r={r}
            stroke="#7c3aed"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 14 14)"
          />
        </svg>
      )}
    </div>
  );
}
