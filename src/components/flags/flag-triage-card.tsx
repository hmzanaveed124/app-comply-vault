"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "~/lib/toast";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  flagIsCmTriaged,
  isComplianceActor,
  isCcoActor,
  meetingAllowsCmTriage,
} from "~/lib/meeting-workflow";
import { FlagResolutionSummary } from "./flag-resolution-summary";
import { TriageControls, type TriageTab } from "./triage-controls";
import { Check, ArrowUp } from "lucide-react";
import type { CmFlagDisposition, FlagStatus } from "../../../generated/prisma";

export type FlagResolutionRecordDTO = {
  id: string;
  resolutionType: string;
  rationale: string;
  metadata: unknown;
  submittedForVerificationAt: string | null;
  closedAt: string | null;
  overrideReason: string | null;
  overrideCategory: string | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    ownerId: string;
    dueDate: string;
    required: boolean;
    completionNote: string | null;
    completedAt: string | null;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    label: string | null;
    url: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
  verifications: Array<{
    id: string;
    reviewerId: string;
    decision: string;
    note: string | null;
    decidedAt: string;
  }>;
};

export type FlagTriageCardFlag = {
  id: string;
  type: string;
  severity: string;
  status: FlagStatus;
  evidence: unknown;
  createdAt: string;
  cmDisposition: CmFlagDisposition;
  escalationReason?: string | null;
  cmTriageNote?: string | null;
  resolutionNote?: string | null;
  resolutionRecord: FlagResolutionRecordDTO | null;
  sourceType?: "MEETING" | "EMAIL";
  sourceHref?: string | null;
  sourceLabel?: string | null;
  /** Client attributed to the email / meeting when known. */
  clientName?: string | null;
};

const severityBadgeClass = (severity: string): string =>
  severity === "CRITICAL"
    ? "border-0 bg-danger-bg text-semantic-danger"
    : "border-0 bg-warning-bg text-semantic-warning";

const typeBadgeClass = "border-0 bg-muted text-secondary-foreground";

function statusBadge(flag: FlagTriageCardFlag): {
  className: string;
  label: string;
  icon?: React.ReactNode;
} {
  if (flag.status === "CLOSED" || flag.status === "CLOSED_ACCEPTED_RISK") {
    return {
      className: "border-0 bg-brand-light text-brand",
      label:
        flag.status === "CLOSED_ACCEPTED_RISK"
          ? "Accepted risk"
          : "Closed — see decision",
      icon: <Check className="h-3 w-3" aria-hidden />,
    };
  }
  if (flag.status === "IN_REMEDIATION")
    return {
      className: "border-0 bg-warning-bg text-semantic-warning",
      label: "Awaiting remediation",
    };
  if (flag.cmDisposition === "NOTED") {
    return {
      className: "border-0 bg-info-bg text-semantic-info",
      label: "Noted",
    };
  }
  if (
    flag.cmDisposition === "ESCALATED" ||
    flag.status === "PENDING_VERIFICATION"
  ) {
    return {
      className: "border-0 bg-warning-bg text-semantic-warning",
      label:
        flag.status === "PENDING_VERIFICATION"
          ? "Awaiting verification"
          : "Escalated",
      icon: <ArrowUp className="h-3 w-3" aria-hidden />,
    };
  }
  return {
    className: "border-0 bg-warning-bg text-semantic-warning",
    label: "Open",
  };
}

function formatTypeLabel(type: string): string {
  return type === "MISSING_DISCLOSURE"
    ? "Disclosure evidence to review"
    : type.replace(/_/g, " ");
}

function getEvidenceQuote(flag: FlagTriageCardFlag): string | null {
  const ev = flag.evidence as {
    recommendation?: { snippet?: string; text?: string };
    excerpt?: string;
    rationale?: string;
  } | null;
  return ev?.excerpt ?? ev?.recommendation?.snippet ?? ev?.rationale ?? null;
}

function getRecommendationText(flag: FlagTriageCardFlag): string | null {
  const ev = flag.evidence as { recommendation?: { text?: string } } | null;
  return ev?.recommendation?.text ?? null;
}

function getStartTime(flag: FlagTriageCardFlag): number | undefined {
  const ev = flag.evidence as {
    recommendation?: { startTime?: number };
    startTime?: number;
  } | null;
  const st = ev?.recommendation?.startTime ?? ev?.startTime;
  return typeof st === "number" ? st : undefined;
}

function cmSummaryDisposition(
  flag: FlagTriageCardFlag,
): CmFlagDisposition | null {
  if (flag.cmDisposition !== "NONE") return flag.cmDisposition;
  if (flag.status === "CLOSED" || flag.status === "CLOSED_ACCEPTED_RISK")
    return "RESOLVED";
  return null;
}

function cmSummaryNote(flag: FlagTriageCardFlag): string {
  if (flag.cmDisposition === "NOTED") return flag.cmTriageNote?.trim() ?? "";
  if (flag.cmDisposition === "ESCALATED")
    return flag.escalationReason?.trim() ?? "";
  if (flag.cmDisposition === "RESOLVED")
    return flag.resolutionNote?.trim() ?? "";
  if (flag.status === "CLOSED" || flag.status === "CLOSED_ACCEPTED_RISK") {
    return (
      flag.resolutionNote?.trim() ?? flag.resolutionRecord?.rationale ?? ""
    );
  }
  return "";
}

export function FlagTriageCard({
  flag,
  meetingStatus,
  userRole,
  readOnlyCompliance,
  forceSummaryOnlyOverride,
  onOpenRemediation,
  onAcceptRisk,
  onReviewEvidence,
  currentUserId,
}: {
  flag: FlagTriageCardFlag;
  meetingStatus: string;
  userRole: string | null | undefined;
  readOnlyCompliance?: boolean;
  forceSummaryOnlyOverride?: boolean;
  onOpenRemediation?: (flag: FlagTriageCardFlag) => void;
  onAcceptRisk?: (flag: FlagTriageCardFlag) => void;
  onReviewEvidence?: (flag: FlagTriageCardFlag) => void;
  currentUserId: string | null | undefined;
}): React.ReactElement {
  const router = useRouter();
  const [triageLoading, setTriageLoading] = useState(false);
  const stBadge = statusBadge(flag);
  const dispositionForSummary = cmSummaryDisposition(flag);
  const showCmTriage =
    isComplianceActor(userRole as never) &&
    (flag.sourceType === "EMAIL" ||
      meetingAllowsCmTriage(meetingStatus as never)) &&
    flag.status === "OPEN" &&
    (flag.cmDisposition === "NONE" || flag.cmDisposition === "NOTED") &&
    !flag.resolutionRecord &&
    !readOnlyCompliance;

  const showResolutionSummary =
    !!dispositionForSummary &&
    dispositionForSummary !== "ESCALATED" &&
    (flagIsCmTriaged({
      status: flag.status as FlagStatus,
      cmDisposition: flag.cmDisposition,
    }) ||
      flag.status === "CLOSED" ||
      flag.status === "CLOSED_ACCEPTED_RISK");

  const showEscalationCallout =
    (flag.cmDisposition === "ESCALATED" ||
      flag.status === "PENDING_VERIFICATION") &&
    !!flag.escalationReason?.trim();

  const nextTask = flag.resolutionRecord?.tasks.find(
    (t) => t.required && t.status !== "COMPLETED",
  );

  const getNextAction = (): string => {
    if (flag.status === "OPEN" && !flag.resolutionRecord)
      return "Start remediation";
    if (flag.status === "PENDING_VERIFICATION") return "Awaiting verification";
    if (flag.status === "CLOSED") return "Closed";
    if (flag.status === "CLOSED_ACCEPTED_RISK") return "Closed — accepted risk";
    return nextTask ? nextTask.title : "Submit for verification";
  };

  const handleTriage = async (
    tab: TriageTab,
    text: string,
    closure?: {
      closureBasis: string;
      evidenceReference: string;
      noFurtherActionRequired: true;
    },
  ): Promise<void> => {
    setTriageLoading(true);
    try {
      const body =
        tab === "resolve"
          ? { action: "resolve", resolutionNote: text, ...closure }
          : tab === "note"
            ? { action: "note", cmTriageNote: text }
            : { action: "escalate", escalationReason: text };
      const res = await fetch(`/api/flags/${flag.id}/cm-triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Triage failed";
        toast.error(msg, {
          duration: 6000,
          action:
            res.status === 400 || res.status === 409
              ? { label: "Refresh", onClick: () => router.refresh() }
              : {
                  label: "Retry",
                  onClick: () => void handleTriage(tab, text),
                },
        });
        return;
      }
      toast.success("Flag triage saved.", { duration: 4000 });
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save — please try again",
        {
          action: {
            label: "Retry",
            onClick: () => void handleTriage(tab, text),
          },
        },
      );
    } finally {
      setTriageLoading(false);
    }
  };

  const quote = getEvidenceQuote(flag);
  const recommendation = getRecommendationText(flag);
  const startTime = getStartTime(flag);

  if (forceSummaryOnlyOverride && dispositionForSummary) {
    return (
      <div className="cv-motion-card-reorder rounded-xl border border-border bg-card p-4 text-[13px] shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              severityBadgeClass(flag.severity),
            )}
          >
            {flag.severity === "CRITICAL" ? "Critical" : "Warning"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              typeBadgeClass,
            )}
          >
            {formatTypeLabel(flag.type)}
          </span>
        </div>
        {recommendation ? (
          <p className="mt-2 text-[14px] font-medium">{recommendation}</p>
        ) : null}
        {dispositionForSummary === "RESOLVED" ||
        dispositionForSummary === "NOTED" ? (
          <div className="mt-2">
            <FlagResolutionSummary
              disposition={dispositionForSummary}
              noteText={cmSummaryNote(flag)}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="cv-motion-card-reorder rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            severityBadgeClass(flag.severity),
          )}
          aria-label={`Severity: ${flag.severity === "CRITICAL" ? "critical" : "warning"}`}
        >
          {flag.severity === "CRITICAL" ? "Critical" : "Warning"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            typeBadgeClass,
          )}
        >
          {formatTypeLabel(flag.type)}
        </span>
        {flag.sourceType === "EMAIL" ? (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            EMAIL
          </span>
        ) : null}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            stBadge.className,
          )}
          aria-label={`Flag status: ${stBadge.label}`}
        >
          {stBadge.icon}
          {stBadge.label}
        </span>
      </div>

      {flag.sourceType === "EMAIL" ? (
        <div className="mt-2 space-y-0.5">
          {flag.clientName ? (
            <p className="text-[14px] font-semibold text-text-primary">
              {flag.clientName}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Client not attributed yet
            </p>
          )}
          {flag.sourceHref ? (
            <p className="text-[12px]">
              <a
                href={flag.sourceHref}
                className="font-semibold text-brand hover:underline"
              >
                {flag.sourceLabel ?? "Open thread"}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {recommendation ? (
        <p className="mt-3 text-[14px] font-medium leading-snug">
          {recommendation}
        </p>
      ) : null}

      {quote ? (
        <blockquote className="mt-2 border-l-2 border-muted-foreground/30 py-0.5 pl-3 text-[13px] italic leading-relaxed text-muted-foreground">
          “{quote}”
        </blockquote>
      ) : null}

      <div className="mt-2 text-[12px] text-muted-foreground">
        {typeof startTime === "number" ? (
          <button
            type="button"
            className="mr-2 rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() =>
              onReviewEvidence?.(flag) ??
              (() => {
                const el = document.querySelector(
                  `[data-timestamp="${Math.floor(startTime)}"]`,
                );
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              })()
            }
          >
            Timestamp {formatTs(startTime)}
          </button>
        ) : null}
        <span>Automated observation · human review required</span>
        {flag.type === "MISSING_DISCLOSURE" ? (
          <p className="mt-1">
            Review the available transcript, applicable firm instructions and
            other records before making a finding.
          </p>
        ) : null}
      </div>

      {flag.evidence &&
      typeof flag.evidence === "object" &&
      "controlSnapshots" in flag.evidence &&
      Array.isArray(flag.evidence.controlSnapshots) ? (
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          {(
            flag.evidence.controlSnapshots as Array<{
              slug: string;
              approvedAt: string;
              config: {
                applicability: string;
                evidenceRequirements: string;
                policyBasis: string;
                exceptions: string;
              };
            }>
          ).map((control) => (
            <details key={control.slug}>
              <summary>Applicable review instructions: {control.slug}</summary>
              <p>Applicability: {control.config.applicability}</p>
              <p>Evidence: {control.config.evidenceRequirements}</p>
              <p>Policy basis: {control.config.policyBasis}</p>
              <p>Exceptions to assess: {control.config.exceptions}</p>
              <p>Approved version: {control.approvedAt}</p>
            </details>
          ))}
        </div>
      ) : null}
      {showEscalationCallout ? (
        <div className="mt-3 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-[12px] text-semantic-warning">
          <span className="font-medium">Escalation reason: </span>
          {flag.escalationReason}
        </div>
      ) : null}

      {(readOnlyCompliance || userRole === "ADVISOR") && !showCmTriage ? (
        <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
          Pending compliance review.
        </p>
      ) : null}

      {showCmTriage ? (
        <TriageControls
          flagId={flag.id}
          onSubmit={handleTriage}
          isSubmitting={triageLoading}
        />
      ) : null}

      {showResolutionSummary &&
      dispositionForSummary &&
      (dispositionForSummary === "RESOLVED" ||
        dispositionForSummary === "NOTED") ? (
        <div className="mt-3">
          <FlagResolutionSummary
            disposition={dispositionForSummary}
            noteText={cmSummaryNote(flag)}
          />
        </div>
      ) : null}

      {isComplianceActor(userRole as never) &&
        !readOnlyCompliance &&
        flag.status !== "CLOSED" &&
        flag.status !== "CLOSED_ACCEPTED_RISK" && (
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
            <div className="grid gap-1 text-[12px] text-muted-foreground sm:grid-cols-3">
              <div>
                <span className="font-medium text-foreground">
                  Next action:
                </span>{" "}
                {getNextAction()}
              </div>
              <div>
                <span className="font-medium text-foreground">Owner:</span>{" "}
                {nextTask
                  ? nextTask.ownerId === currentUserId
                    ? "You"
                    : nextTask.ownerId.slice(0, 8)
                  : "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Due:</span>{" "}
                {nextTask
                  ? new Date(nextTask.dueDate).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onReviewEvidence?.(flag) ??
                  (() => {
                    if (typeof startTime === "number") {
                      const el = document.querySelector(
                        `[data-timestamp="${Math.floor(startTime)}"]`,
                      );
                      el?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  })()
                }
              >
                Review evidence
              </Button>
              {onOpenRemediation ? (
                <>
                  {flag.status === "OPEN" && !flag.resolutionRecord ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenRemediation(flag)}
                    >
                      Start remediation
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenRemediation(flag)}
                    >
                      Manage remediation
                    </Button>
                  )}
                  {userRole === "OWNER_CCO" && flag.status === "OPEN" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        onAcceptRisk?.(flag) ?? onOpenRemediation?.(flag)
                      }
                    >
                      Accept risk
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

      {isCcoActor(userRole as never) &&
      meetingStatus === "CM_REVIEWED" &&
      (flag.status === "PENDING_VERIFICATION" ||
        flag.cmDisposition === "ESCALATED") &&
      onOpenRemediation ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onOpenRemediation(flag)}
          >
            Resolve / verify flag
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
