export default function SupervisionLoading(): React.JSX.Element {
  return (
    <div className="min-h-0 bg-surface-page px-6 py-6" aria-busy="true" aria-label="Loading supervision">
      <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-6">
        <div className="h-8 w-72 rounded bg-surface-border" />
        <div className="h-4 w-full max-w-xl rounded bg-surface-muted" />
        <div className="h-28 rounded-[12px] border border-surface-border bg-surface-card" />
        <div className="h-40 rounded-[12px] border border-surface-border bg-surface-card" />
        <div className="h-56 rounded-[12px] border border-surface-border bg-surface-card" />
      </div>
    </div>
  );
}
