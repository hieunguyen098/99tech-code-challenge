/** Placeholder with the same shape as `SwapForm`; keep the two in sync. */
export function SwapFormSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading swap form"
      className="flex animate-pulse flex-col gap-2"
    >
      <div className="h-32 rounded-2xl bg-slate-800/60" />
      <div className="h-32 rounded-2xl bg-slate-800/60" />
      <div className="mt-2 h-14 rounded-2xl bg-slate-800/60" />
    </div>
  );
}
