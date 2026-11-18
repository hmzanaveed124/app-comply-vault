"use client";

export default function DocumentRequestError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Could not load document request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Refresh and try again. If this persists, confirm the demo seed ran for
        this workspace.
      </p>
      <button
        type="button"
        className="mt-4 text-sm font-medium text-text-primary underline"
        onClick={reset}
      >
        Try again
      </button>
    </main>
  );
}
