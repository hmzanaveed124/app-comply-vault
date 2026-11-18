"use client";

import { Check, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import type { MeetingStatus } from "../../../generated/prisma";

const STEPS = [
  { id: 1, label: "Advisor certified" },
  { id: 2, label: "CM review" },
  { id: 3, label: "CCO sign-off" },
  { id: 4, label: "Finalized" },
] as const;

function stepIndexForStatus(status: MeetingStatus | string): number {
  switch (status) {
    case "DRAFT_READY":
    case "DRAFT":
      return 0;
    case "ADVISOR_CERTIFIED":
      return 1;
    case "CM_REVIEWED":
      return 2;
    case "CCO_SIGNED_OFF":
      return 3;
    case "FINALIZED":
      return 4;
    default:
      return 0;
  }
}

type StepState = "done" | "active" | "pending";

function stepState(stepIdx: number, status: string): StepState {
  if (status === "FINALIZED") return "done";
  const active = stepIndexForStatus(status);
  if (stepIdx < active) return "done";
  if (stepIdx === active) return "active";
  return "pending";
}

export function WorkflowStepper({
  meetingStatus,
  advisorName,
  certifiedAt,
}: {
  meetingStatus: MeetingStatus | string;
  advisorName: string | null;
  certifiedAt: string | null;
}): React.ReactElement {
  const showWorkflow =
    meetingStatus === "DRAFT_READY" ||
    meetingStatus === "DRAFT" ||
    meetingStatus === "ADVISOR_CERTIFIED" ||
    meetingStatus === "CM_REVIEWED" ||
    meetingStatus === "CCO_SIGNED_OFF" ||
    meetingStatus === "FINALIZED";

  if (!showWorkflow) {
    return (
      <div className="rounded-lg border border-surface-muted bg-surface-muted/30 px-5 py-3 text-[13px] text-text-primary">
        Workflow steps will appear once this meeting is ready for advisor review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <nav aria-label="Meeting sign-off progress" className="w-full overflow-x-auto">
        <ol className="flex min-w-[600px] items-stretch">
          {STEPS.map((step, idx) => {
            const state = stepState(idx, meetingStatus);
            return (
              <li
                key={step.id}
                className="flex min-w-0 flex-1 items-stretch"
                aria-current={state === "active" ? "step" : undefined}
              >
                <div
                  className={cn(
                    "flex w-full flex-col items-center border-b-2 px-1 py-2 sm:px-2 cv-motion-step-transition",
                    state === "done" && "border-brand",
                    state === "active" && "border-semantic-info",
                    state === "pending" && "border-surface-border",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium cv-motion-step-transition",
                      state === "done" &&
                        "bg-brand-light text-brand",
                      state === "active" &&
                        "bg-info-bg text-semantic-info",
                      state === "pending" &&
                        "bg-surface-muted text-text-primary/70",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    ) : state === "active" ? (
                      <Clock className="h-4 w-4" aria-hidden />
                    ) : (
                      <span aria-hidden>{step.id}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-center text-[11px] font-medium leading-tight sm:text-[12px]",
                      state === "done" && "text-brand",
                      state === "active" && "text-semantic-info",
                      state === "pending" && "text-text-primary/70",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {certifiedAt && advisorName ? (
        <div
          className="flex items-start gap-2 rounded-lg bg-brand-light px-3 py-2.5 text-[13px] text-brand"
          role="status"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Certified by {advisorName} on {new Date(certifiedAt).toLocaleString()}.
          </span>
        </div>
      ) : certifiedAt ? (
        <div
          className="flex items-start gap-2 rounded-lg bg-brand-light px-3 py-2.5 text-[13px] text-brand"
          role="status"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Certified on {new Date(certifiedAt).toLocaleString()}.</span>
        </div>
      ) : null}
    </div>
  );
}
