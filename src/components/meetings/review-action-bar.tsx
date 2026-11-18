"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "~/lib/toast";
import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import FinalizeButton from "~/app/(app)/meetings/[id]/finalize-button";
import {
  flagIsCmTriaged,
  hasPendingCcoEscalations,
  isAdvisorActor,
  isComplianceActor,
  isCcoActor,
  meetingAllowsAdvisorCertify,
  meetingAllowsCmComplete,
  meetingAllowsCcoSignOff,
} from "~/lib/meeting-workflow";
import type { CmFlagDisposition, FlagStatus } from "../../../generated/prisma";
import { cn } from "~/lib/utils";

type FlagLite = {
  id: string;
  status: FlagStatus;
  cmDisposition: CmFlagDisposition;
};

const ATTESTATION_ADVISOR =
  "I confirm that this meeting record accurately reflects the discussion that took place. Any corrections have been made above.";

export function ReviewActionBar({
  meetingId,
  clientName,
  meetingStatus,
  userRole,
  flags,
  evidenceCoverage,
  editedClaimsCount,
  openCriticalFlagsCount,
  openWarningFlagsCount,
}: {
  meetingId: string;
  clientName: string;
  meetingStatus: string;
  userRole: string | null | undefined;
  flags: FlagLite[];
  evidenceCoverage: number | null;
  editedClaimsCount: number;
  openCriticalFlagsCount: number;
  openWarningFlagsCount: number;
}): React.ReactElement | null {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const prevAllTriaged = useRef<boolean | null>(null);
  const [pulseComplete, setPulseComplete] = useState(false);

  const allTriaged =
    flags.length === 0 ||
    flags.every((f) => flagIsCmTriaged({ status: f.status, cmDisposition: f.cmDisposition }));
  const remainingTriage = flags.filter((f) => !flagIsCmTriaged(f)).length;
  const pendingEscalations = hasPendingCcoEscalations(flags);
  const escalatedRemaining = flags.filter((f) => f.status === "PENDING_VERIFICATION").length;

  useEffect(() => {
    const was = prevAllTriaged.current;
    prevAllTriaged.current = allTriaged;
    if (
      was === false &&
      allTriaged === true &&
      isComplianceActor(userRole as never) &&
      meetingAllowsCmComplete(meetingStatus as never)
    ) {
      setPulseComplete(true);
      const t = window.setTimeout(() => setPulseComplete(false), 650);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [allTriaged, meetingStatus, userRole]);

  const run = async (
    key: string,
    url: string,
    init?: RequestInit,
    successToast?: string,
  ): Promise<void> => {
    setLoading(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Request failed";
        const refreshFirst =
          res.status === 400 || res.status === 403 || res.status === 404 || res.status === 409;
        toast.error(msg, {
          duration: 6000,
          action: refreshFirst
            ? { label: "Refresh", onClick: () => router.refresh() }
            : { label: "Retry", onClick: () => void run(key, url, init, successToast) },
        });
        return;
      }
      if (successToast) {
        toast.success(successToast, { duration: 4000 });
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save — please try again", {
        duration: 6000,
        action: { label: "Retry", onClick: () => void run(key, url, init, successToast) },
      });
    } finally {
      setLoading(null);
    }
  };

  if (isAdvisorActor(userRole as never) && meetingAllowsAdvisorCertify(meetingStatus as never)) {
    return (
      <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[13px] text-muted-foreground">{ATTESTATION_ADVISOR}</p>
        <Button
          type="button"
          className="shrink-0 rounded-full text-[14px] font-medium"
          disabled={loading !== null}
          aria-busy={loading === "certify"}
          onClick={() =>
            void run(
              "certify",
              `/api/meetings/${meetingId}/certify`,
              undefined,
              `${clientName} — certification saved`,
            )
          }
        >
          {loading === "certify" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Certifying…
            </>
          ) : (
            "Certify meeting accuracy"
          )}
        </Button>
      </div>
    );
  }

  if (isComplianceActor(userRole as never) && meetingAllowsCmComplete(meetingStatus as never)) {
    return (
      <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          {remainingTriage > 0
            ? `${remainingTriage} flag${remainingTriage === 1 ? "" : "s"} remaining`
            : "All flags triaged"}
        </p>
        <Button
          type="button"
          className={cn(
            "shrink-0 rounded-full bg-semantic-info px-5 text-[14px] font-medium text-white hover:bg-semantic-info/90 disabled:pointer-events-none disabled:opacity-45",
            pulseComplete && "cv-motion-pulse-once",
          )}
          disabled={loading !== null || !allTriaged}
          aria-busy={loading === "cm"}
          onClick={() =>
            void run(
              "cm",
              `/api/meetings/${meetingId}/cm-review`,
              undefined,
              `${clientName} — compliance review completed`,
            )
          }
        >
          {loading === "cm" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Completing…
            </>
          ) : (
            "Complete compliance review"
          )}
        </Button>
      </div>
    );
  }

  if (isCcoActor(userRole as never) && meetingAllowsCcoSignOff(meetingStatus as never)) {
    return (
      <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          {escalatedRemaining > 0
            ? `${escalatedRemaining} escalated flag${escalatedRemaining === 1 ? "" : "s"} remaining`
            : "No pending escalations"}
        </p>
        <Button
          type="button"
          className="shrink-0 rounded-full bg-semantic-info px-5 text-[14px] font-medium text-white hover:bg-semantic-info/90 disabled:pointer-events-none disabled:opacity-45"
          disabled={loading !== null || pendingEscalations}
          aria-busy={loading === "cco"}
          onClick={() =>
            void run(
              "cco",
              `/api/meetings/${meetingId}/cco-signoff`,
              undefined,
              `${clientName} — CCO sign-off recorded`,
            )
          }
        >
          {loading === "cco" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Signing off…
            </>
          ) : (
            "Sign off compliance review"
          )}
        </Button>
      </div>
    );
  }

  if (meetingStatus === "CCO_SIGNED_OFF" && userRole === "OWNER_CCO") {
    return (
      <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">All reviews complete</p>
        <FinalizeButton
          meetingId={meetingId}
          meetingStatus={meetingStatus}
          userRole={userRole}
          evidenceCoverage={evidenceCoverage}
          editedClaimsCount={editedClaimsCount}
          openCriticalFlagsCount={openCriticalFlagsCount}
          openWarningFlagsCount={openWarningFlagsCount}
          embedInActionBar
        />
      </div>
    );
  }

  return null;
}
