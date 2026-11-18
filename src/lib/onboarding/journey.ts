import type { WorkspaceRoleKey } from "~/lib/role-config";
export type JourneyInput = {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  role: WorkspaceRoleKey;
  dismissed: boolean;
  mediaReady: boolean;
  meetingCount: number;
  hasCorrespondence?: boolean;
  reviewedCount: number;
  finishedCount: number;
  connected: boolean;
  nextRecord: { id: string; status: string } | null;
  processingRecord: { id: string; failed: boolean } | null;
};
export type JourneyStep = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  href: string | null;
  action: string;
  blocked?: boolean;
};
export type NextAction = {
  kind: "setup" | "waiting" | "upload" | "review" | "processing" | "ready";
  title: string;
  description: string;
  href: string | null;
  action: string;
};
export type WorkspaceJourney = JourneyInput & {
  steps: JourneyStep[];
  next: NextAction;
  completed: number;
};

export function buildWorkspaceJourney(input: JourneyInput): WorkspaceJourney {
  const owner = input.role === "OWNER_CCO";
  const advisor = input.role === "ADVISOR";
  const recordHref = input.nextRecord
    ? `/meetings/${encodeURIComponent(input.nextRecord.id)}`
    : "/interaction-log";
  const steps: JourneyStep[] = [
    {
      id: "policy",
      title: "Set the recording policy",
      description: owner
        ? "Choose how this workspace retains source recordings before adding a meeting."
        : "Your workspace CCO sets how source recordings are retained.",
      complete: input.mediaReady,
      href: owner ? "/settings/media-posture" : null,
      action: owner ? "Set recording policy" : "Ask your CCO",
      blocked: !owner && !input.mediaReady,
    },
    {
      id: "meeting",
      title: "Add your first meeting",
      description:
        "Upload an existing recording. Connect Zoom later if you want automatic capture.",
      complete: input.meetingCount > 0,
      href: input.mediaReady ? "/upload" : null,
      action: "Add a recording",
      blocked: !input.mediaReady,
    },
    {
      id: "review",
      title: advisor ? "Check the meeting record" : "Review the meeting record",
      description: advisor
        ? "Check the transcript and summary against what was discussed, then certify the record."
        : "Open the record, check its source and context, and complete the review for your role.",
      complete: input.reviewedCount > 0,
      href: input.meetingCount > 0 ? recordHref : null,
      action: "Open a record",
      blocked: input.meetingCount === 0,
    },
    {
      id: "finish",
      title: owner
        ? "Finalize your first record"
        : advisor
          ? "Certify your first record"
          : "Complete your first review",
      description: owner
        ? "Finish the required review stages and finalize the record. The review stays in human hands."
        : advisor
          ? "Your certification hands the record to compliance for its next review stage."
          : "Record your review and hand the meeting to the CCO for sign-off.",
      complete: input.finishedCount > 0,
      href: input.meetingCount > 0 ? recordHref : null,
      action: owner ? "Continue the review" : "Continue your handoff",
      blocked: input.meetingCount === 0,
    },
  ];
  let next: NextAction;
  if (!input.mediaReady && !input.nextRecord && !input.processingRecord) {
    next = {
      kind: owner ? "setup" : "waiting",
      title: owner
        ? "First, choose your recording policy"
        : "Your CCO needs to finish workspace setup",
      description: owner
        ? "Record the source-media decision to enable uploads. You can take the walkthrough while you decide."
        : "Recording uploads become available once your CCO records the workspace's source-media decision.",
      href: owner ? "/settings/media-posture" : null,
      action: owner ? "Set recording policy" : "Waiting for your CCO",
    };
  } else if (input.nextRecord) {
    const status = input.nextRecord.status;
    const action =
      status === "CCO_SIGNED_OFF"
        ? "Finalize the record"
        : status === "CM_REVIEWED"
          ? "Review for sign-off"
          : status === "ADVISOR_CERTIFIED"
            ? "Review the certified record"
            : "Check the transcript and summary";
    next = {
      kind: "review",
      title: action,
      description:
        "A meeting is ready for the next review stage available to your role. Open its source and complete your part of the workflow.",
      href: recordHref,
      action: "Continue this record",
    };
  } else if (input.processingRecord) {
    next = {
      kind: "processing",
      title: input.processingRecord.failed
        ? "A recording needs processing attention"
        : "Your recording is being prepared",
      description: input.processingRecord.failed
        ? "Processing did not finish successfully. Open the record to check its status before continuing."
        : "The transcript and summary are not ready yet. Check progress here; this page refreshes while it is open.",
      href: `/meetings/${encodeURIComponent(input.processingRecord.id)}`,
      action: "Check recording progress",
    };
  } else if (input.meetingCount === 0 && input.hasCorrespondence) {
    next = {
      kind: "ready",
      title: "You have client correspondence to explore",
      description:
        "Open the correspondence already in this workspace, or add your first meeting to bring its transcript and summary into the workflow.",
      href: "/communications",
      action: "Open correspondence",
    };
  } else if (input.meetingCount === 0) {
    next = {
      kind: "upload",
      title: "Turn your first meeting into a useful record",
      description:
        "Start with one recording, check the summary and transcript, then take it through review. Integrations can come after your first record.",
      href: "/upload",
      action: "Add your first meeting",
    };
  } else {
    next = {
      kind: "ready",
      title: "No meeting is waiting for your review stage",
      description:
        input.finishedCount > 0
          ? "Continue with another meeting, or revisit the interaction log for earlier records and their context."
          : "Your current records may be with another reviewer. Open the interaction log to see their progress, or add another meeting.",
      href: "/interaction-log",
      action: "Open interaction log",
    };
  }
  return {
    ...input,
    steps,
    next,
    completed: steps.filter((step) => step.complete).length,
  };
}
