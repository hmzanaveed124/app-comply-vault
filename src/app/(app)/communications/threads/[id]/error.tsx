"use client";

export default function ThreadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="text-lg font-semibold text-destructive">Could not load thread</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button type="button" onClick={reset} className="mt-4 text-sm text-brand hover:underline">
        Try again
      </button>
    </div>
  );
}
