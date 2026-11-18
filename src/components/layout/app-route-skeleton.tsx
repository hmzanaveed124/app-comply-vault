type AppRouteSkeletonProps = {
  /** Accessible label for the busy region */
  label?: string;
  /** Taller table-style block for list-heavy pages */
  variant?: "default" | "table";
};

function CardBlock({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`rounded-[12px] border border-surface-border bg-surface-card ${className}`}
    />
  );
}

/**
 * Shared pulse skeleton for (app) route navigations.
 * Route-specific loading.tsx files may re-export this or use a richer layout.
 */
export function AppRouteSkeleton({
  label = "Loading page",
  variant = "default",
}: AppRouteSkeletonProps): React.JSX.Element {
  return (
    <div
      className="min-h-0 bg-surface-page px-6 py-6"
      aria-busy="true"
      aria-label={label}
    >
      <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-6">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded bg-surface-border" />
          <div className="h-4 w-full max-w-xl rounded bg-surface-muted" />
        </div>
        {variant === "table" ? (
          <>
            <div className="h-24 rounded-[12px] border border-surface-border bg-surface-card" />
            <CardBlock className="min-h-[320px]" />
          </>
        ) : (
          <>
            <CardBlock className="h-28" />
            <CardBlock className="h-40" />
            <CardBlock className="h-56" />
          </>
        )}
      </div>
    </div>
  );
}
