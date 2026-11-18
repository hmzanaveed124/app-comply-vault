"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function FindingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("Finding page error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="min-h-0 bg-surface-page px-6 py-6">
      <div className="mx-auto max-w-lg rounded-[12px] border border-surface-border bg-surface-card p-6">
        <h1 className="text-[16px] font-semibold text-text-primary">Finding could not be loaded</h1>
        <p className="mt-2 text-[13px] text-text-secondary">
          An error occurred while loading this supervisory finding. Retry, or return to the
          Priority Inbox.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-[8px] bg-surface-strong px-3 py-2 text-[13px] font-medium text-white"
          >
            Retry
          </button>
          <Link
            href="/priority-inbox"
            className="rounded-[8px] border border-surface-border px-3 py-2 text-[13px] font-medium text-text-primary"
          >
            Priority Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
