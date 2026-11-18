"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MeetingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("Meeting page error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-[12px] border border-surface-border bg-surface-card p-6">
        <h1 className="text-[16px] font-semibold text-text-primary">
          Meeting could not be loaded
        </h1>
        <p className="mt-2 text-[13px] text-text-secondary">
          An error occurred while loading this meeting. Retry, or return to the
          dashboard.
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
            href="/dashboard"
            className="rounded-[8px] border border-surface-border px-3 py-2 text-[13px] font-medium text-text-primary"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
