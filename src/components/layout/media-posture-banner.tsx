import Link from "next/link";

/**
 * CV-TR-06a — persistent notice while a workspace has no recorded media posture.
 * Ingest is blocked for every role until the CCO decides.
 */
export function MediaPostureBanner({ isCco }: { isCco: boolean }) {
  return (
    <div className="border-b border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">Ingest is blocked.</span>
        <span>
          This workspace has not recorded a source media retention decision.
          {isCco
            ? " Record the decision to enable uploads and automatic ingestion."
            : " The workspace CCO must record the decision before uploads resume."}
        </span>
        {isCco && (
          <Link
            href="/settings/media-posture"
            className="font-medium underline underline-offset-2"
          >
            Record decision
          </Link>
        )}
      </div>
    </div>
  );
}
