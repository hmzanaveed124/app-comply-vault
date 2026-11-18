"use client";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { useMeetingStaleDetection } from "~/hooks/use-meeting-stale-detection";

const STALE_POLL_STATUSES = new Set([
  "DRAFT",
  "DRAFT_READY",
  "ADVISOR_CERTIFIED",
  "CM_REVIEWED",
  "CCO_SIGNED_OFF",
]);

export function MeetingStaleBanner({
  meetingId,
  meetingStatus,
  initialSyncToken,
}: {
  meetingId: string;
  meetingStatus: string;
  initialSyncToken: string;
}): React.ReactElement | null {
  const enabled = STALE_POLL_STATUSES.has(meetingStatus);
  const { stale, clearStale } = useMeetingStaleDetection({
    meetingId,
    initialSyncToken,
    enabled,
  });

  if (!stale) return null;

  return (
    <Alert
      variant="default"
      role="status"
      aria-live="polite"
      className="border-warning-border bg-warning-bg text-warning-text dark:border-warning-border dark:bg-semantic-warning/40 dark:text-warning-text"
    >
      <AlertTitle className="text-sm font-semibold">Meeting updated elsewhere</AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          This meeting has been updated by another user. Refresh to see the latest state.
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => clearStale()}
        >
          Refresh
        </Button>
      </AlertDescription>
    </Alert>
  );
}
