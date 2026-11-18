function CardSkeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-[10px] border border-surface-border bg-surface-card p-[18px] shadow-[0_1px_2px_rgba(20,31,25,0.04)] ${className}`}
    >
      <div className="mb-4 h-3 w-32 rounded bg-surface-muted" />
      <div className="mb-3 h-7 w-24 rounded bg-surface-muted" />
      <div className="space-y-2">
        <div className="h-2 w-full rounded bg-surface-muted" />
        <div className="h-2 w-5/6 rounded bg-surface-muted" />
        <div className="h-2 w-2/3 rounded bg-surface-muted" />
      </div>
    </div>
  );
}

export default function DashboardLoading(): React.JSX.Element {
  return (
    <div className="min-h-0 bg-surface-page px-6 py-6">
      <div className="mx-auto w-full max-w-[1240px] space-y-3.5">
        <div className="mb-1 flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-surface-muted" />
          </div>
          <div className="h-9 w-40 animate-pulse rounded-[8px] bg-surface-muted" />
        </div>
        <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[5fr_4fr_3fr]">
          <CardSkeleton className="min-h-[220px]" />
          <CardSkeleton className="min-h-[220px]" />
          <CardSkeleton className="min-h-[220px]" />
        </div>
        <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton className="min-h-[140px]" />
          <CardSkeleton className="min-h-[140px]" />
          <CardSkeleton className="min-h-[140px]" />
        </div>
        <CardSkeleton className="min-h-[240px]" />
        <CardSkeleton className="min-h-[200px]" />
        <CardSkeleton className="min-h-[200px]" />
      </div>
    </div>
  );
}
