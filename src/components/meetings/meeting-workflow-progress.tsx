"use client";

import { WorkflowStepper } from "./workflow-stepper";
import { isComplianceActor } from "~/lib/meeting-workflow";
import { cn } from "~/lib/utils";
import type { CmFlagDisposition, FlagStatus } from "../../../generated/prisma";

export function MeetingWorkflowProgress({
  meetingStatus,
  userRole,
  advisorName,
  advisorCertifiedAt,
  flags,
}: {
  meetingStatus: string;
  userRole: string | null | undefined;
  advisorName: string | null;
  advisorCertifiedAt: string | null;
  flags: Array<{ status: FlagStatus; cmDisposition: CmFlagDisposition }>;
}): React.ReactElement {
  const showCmBar =
    meetingStatus === "ADVISOR_CERTIFIED" &&
    isComplianceActor(userRole as never) &&
    flags.length > 0;

  const triaged = flags.filter((f) => f.cmDisposition !== "NONE").length;
  const total = flags.length;
  const pct = total > 0 ? Math.round((triaged / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <WorkflowStepper
        meetingStatus={meetingStatus}
        advisorName={advisorName}
        certifiedAt={advisorCertifiedAt}
      />
      {showCmBar ? (
        <div className="mt-4">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={triaged}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuetext={`${triaged} of ${total} flags triaged`}
            aria-label="Flag triage progress"
          >
            <div
              className={cn("h-full rounded-full bg-semantic-info cv-motion-fill")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[13px] text-muted-foreground">
            {triaged} of {total} flags triaged
          </p>
        </div>
      ) : null}
    </div>
  );
}
