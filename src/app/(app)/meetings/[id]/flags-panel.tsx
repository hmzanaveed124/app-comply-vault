"use client";
import { toast } from "~/lib/toast";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { getCategoryBySlug } from "~/lib/disclosure-categories";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  ownerId: string;
  dueDate: string;
  required: boolean;
  completionNote: string | null;
  completedAt: string | null;
}

interface EvidenceItem {
  id: string;
  type: string;
  label: string | null;
  url: string | null;
  metadata: any;
  createdAt: string;
}

interface VerificationItem {
  id: string;
  reviewerId: string;
  decision: string;
  note: string | null;
  decidedAt: string;
}

interface ResolutionRecord {
  id: string;
  resolutionType: string;
  rationale: string;
  metadata: any;
  submittedForVerificationAt: string | null;
  closedAt: string | null;
  overrideReason: string | null;
  overrideCategory: string | null;
  tasks: TaskItem[];
  evidence: EvidenceItem[];
  verifications: VerificationItem[];
}

export interface FlagItem {
  id: string;
  type: string;
  severity: string;
  status: string;
  evidence: any;
  createdAt: string;
  resolutionRecord: ResolutionRecord | null;
  cmDisposition?: string;
  escalationReason?: string | null;
  cmTriageNote?: string | null;
  resolutionNote?: string | null;
}

const getSeverityVariant = (
  severity: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (severity) {
    case "CRITICAL":
      return "destructive";
    case "WARN":
      return "default";
    default:
      return "secondary";
  }
};

function MissingDisclosureCategoryNote({
  evidence,
}: {
  evidence: Record<string, unknown>;
}): ReactNode {
  const matched = evidence.matchedCategories as string[] | undefined;
  if (!matched?.length) return null;

  const active = (evidence.activeCategories as string[] | undefined) ?? [];
  const suppressed =
    (evidence.suppressedCategories as string[] | undefined) ?? [];
  const primarySlug =
    active[0] ??
    matched.find((s) => {
      const def = getCategoryBySlug(s);
      return def && !suppressed.includes(s);
    }) ??
    matched[0];
  const primaryName = primarySlug
    ? (getCategoryBySlug(primarySlug)?.displayName ?? primarySlug)
    : null;

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {primaryName ? (
        <div>
          <span className="font-medium text-foreground">Category:</span>{" "}
          {primaryName}
        </div>
      ) : null}
      {suppressed.map((slug) => {
        const name = getCategoryBySlug(slug)?.displayName ?? slug;
        return (
          <div key={slug} className="italic">
            {name} suppressed per firm profile.
          </div>
        );
      })}
    </div>
  );
}

const getStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "OPEN":
      return "secondary";
    case "IN_REMEDIATION":
      return "default";
    case "PENDING_VERIFICATION":
      return "outline";
    case "CLOSED_ACCEPTED_RISK":
      return "destructive";
    default:
      return "secondary";
  }
};

const resolutionLabels: Record<string, string> = {
  ADD_CONTEXT: "Add context",
  DISCLOSED_ELSEWHERE: "Disclosed elsewhere",
  FOLLOW_UP_REQUIRED: "Follow-up required",
  OVERRIDE_APPROVED: "Accepted risk",
  DISMISSED_WITH_REASON: "Dismissed with reason",
};

const formatStatusLabel = (status: string) =>
  status.replace(/_/g, " ").toLowerCase();

const formatLocalDateTime = (date: Date) => date.toISOString().slice(0, 16);

export default function FlagsPanel({
  flags,
  userRole,
  currentUserId,
  readOnlyCompliance,
  renderFlagCards,
}: {
  flags: FlagItem[];
  userRole: string | null | undefined;
  currentUserId: string | null | undefined;
  readOnlyCompliance?: boolean;
  renderFlagCards?: (ctx: {
    openRemediation: (flag: FlagItem) => void;
    openAcceptRisk: (flag: FlagItem) => void;
  }) => ReactNode;
}) {
  const router = useRouter();
  const [activeFlag, setActiveFlag] = useState<FlagItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState("ADD_CONTEXT");
  const [rationale, setRationale] = useState("");
  const [dueDate, setDueDate] = useState(
    formatLocalDateTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
  );
  const [sourceType, setSourceType] = useState("");
  const [disclosureDate, setDisclosureDate] = useState(
    formatLocalDateTime(new Date()),
  );
  const [ackStatus, setAckStatus] = useState("YES");
  const [followUpMethod, setFollowUpMethod] = useState("");
  const [planNote, setPlanNote] = useState("");
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(true);
  const [evidenceType, setEvidenceType] = useState("TRANSCRIPT_SNIPPET");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [snippetStartTime, setSnippetStartTime] = useState("");
  const [snippetText, setSnippetText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<TaskItem | null>(null);
  const [taskNote, setTaskNote] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideCategory, setOverrideCategory] = useState("");

  useEffect(() => {
    const handleTimestamp = (event: Event) => {
      const custom = event as CustomEvent<{ timestamp?: number }>;
      if (custom.detail?.timestamp !== undefined) {
        setSnippetStartTime(String(custom.detail.timestamp));
      }
    };
    window.addEventListener("setTimestamp", handleTimestamp);
    return () => window.removeEventListener("setTimestamp", handleTimestamp);
  }, []);

  if (readOnlyCompliance && renderFlagCards) {
    return (
      <div className="space-y-3">
        {renderFlagCards({
          openRemediation: () => undefined,
          openAcceptRisk: () => undefined,
        })}
      </div>
    );
  }

  if (readOnlyCompliance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
            Compliance flags — pending review by the compliance team. You can
            review context here; only compliance staff can resolve or escalate.
          </p>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No flags for this meeting.
            </p>
          ) : (
            flags.map((flag) => (
              <div
                key={flag.id}
                className="rounded-md border p-3 space-y-1 opacity-90"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getSeverityVariant(flag.severity)}>
                    {flag.severity}
                  </Badge>
                  <Badge variant="outline">
                    {flag.type.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant={getStatusVariant(flag.status)}>
                    {formatStatusLabel(flag.status)}
                  </Badge>
                </div>
                {flag.evidence?.recommendation?.text ? (
                  <div className="text-sm text-muted-foreground">
                    {flag.evidence.recommendation.text}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (!flags.length && !renderFlagCards) {
    return null;
  }

  const openDrawer = (flag: FlagItem) => {
    setActiveFlag(flag);
    setResolutionType(flag.resolutionRecord?.resolutionType ?? "ADD_CONTEXT");
    setRationale(flag.resolutionRecord?.rationale ?? "");
    setSourceType(flag.resolutionRecord?.metadata?.sourceType ?? "");
    setDisclosureDate(
      flag.resolutionRecord?.metadata?.disclosureDate ??
        formatLocalDateTime(new Date()),
    );
    setAckStatus(
      flag.resolutionRecord?.metadata?.acknowledgementStatus ?? "YES",
    );
    setFollowUpMethod(flag.resolutionRecord?.metadata?.followUpMethod ?? "");
    setPlanNote(flag.resolutionRecord?.metadata?.planNote ?? "");
    setRequireAcknowledgement(
      flag.resolutionRecord?.metadata?.requireAcknowledgement ??
        flag.severity === "CRITICAL",
    );
    setDrawerOpen(true);
  };

  const openOverrideDialog = (flag: FlagItem) => {
    setActiveFlag(flag);
    setOverrideDialogOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveFlag(null);
    setEvidenceType("TRANSCRIPT_SNIPPET");
    setEvidenceLabel("");
    setEvidenceUrl("");
    setSnippetStartTime("");
    setSnippetText("");
  };

  const activeTasks = activeFlag?.resolutionRecord?.tasks ?? [];
  const activeEvidence = activeFlag?.resolutionRecord?.evidence ?? [];
  const requiredTasksIncomplete = activeTasks.some(
    (task) => task.required && task.status !== "COMPLETED",
  );

  const evidenceReady = useMemo(() => {
    if (!activeFlag?.resolutionRecord) return false;
    const evidenceTypes = new Set(activeEvidence.map((item) => item.type));
    if (activeFlag.resolutionRecord.resolutionType === "ADD_CONTEXT") {
      return evidenceTypes.has("TRANSCRIPT_SNIPPET");
    }
    if (activeFlag.resolutionRecord.resolutionType === "DISCLOSED_ELSEWHERE") {
      return evidenceTypes.has("DOCUMENT_LINK");
    }
    if (activeFlag.resolutionRecord.resolutionType === "FOLLOW_UP_REQUIRED") {
      const requireAck =
        activeFlag.resolutionRecord.metadata?.requireAcknowledgement ??
        activeFlag.severity === "CRITICAL";
      return requireAck
        ? evidenceTypes.has("OUTREACH_PROOF") &&
            evidenceTypes.has("ACKNOWLEDGEMENT")
        : evidenceTypes.has("OUTREACH_PROOF");
    }
    return false;
  }, [activeEvidence, activeFlag]);

  const evidenceFormValid =
    evidenceType === "NOTE"
      ? snippetText.trim().length > 0
      : evidenceType === "TRANSCRIPT_SNIPPET"
        ? snippetText.trim().length > 0 && snippetStartTime.trim().length > 0
        : evidenceUrl.trim().length > 0;

  const getNextAction = (flag: FlagItem) => {
    if (flag.status === "OPEN") return "Start remediation";
    if (flag.status === "PENDING_VERIFICATION") return "Awaiting verification";
    if (flag.status === "CLOSED") return "Closed";
    if (flag.status === "CLOSED_ACCEPTED_RISK") return "Closed - accepted risk";
    const tasks = flag.resolutionRecord?.tasks ?? [];
    const nextTask = tasks.find(
      (task) => task.required && task.status !== "COMPLETED",
    );
    return nextTask ? nextTask.title : "Submit for verification";
  };

  const reviewEvidence = (flag: FlagItem) => {
    const startTime =
      flag.evidence?.recommendation?.startTime ?? flag.evidence?.startTime;
    if (typeof startTime === "number") {
      const segmentElement = document.querySelector(
        `[data-timestamp="${Math.floor(startTime)}"]`,
      );
      if (segmentElement) {
        segmentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        segmentElement.classList.add("bg-warning-bg");
        setTimeout(() => {
          segmentElement.classList.remove("bg-warning-bg");
        }, 2000);
      }
    }
  };

  const scrollToClaim = (flag: FlagItem) => {
    const claimKey = flag.evidence?.recommendation?.startTime;
    if (typeof claimKey !== "number") {
      return;
    }
    const claimElement = document.querySelector(
      `[data-claim-field="recommendations"][data-claim-start="${Math.floor(claimKey)}"]`,
    );
    if (claimElement) {
      claimElement.scrollIntoView({ behavior: "smooth", block: "center" });
      claimElement.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => {
        claimElement.classList.remove("ring-2", "ring-amber-400");
      }, 2000);
    }
  };

  const handleStartRemediation = async () => {
    if (!activeFlag) return;
    setIsSaving(true);
    try {
      const evidencePayload: EvidenceItem[] = [];
      if (resolutionType === "ADD_CONTEXT") {
        evidencePayload.push({
          id: "",
          type: "TRANSCRIPT_SNIPPET",
          label: evidenceLabel || "Transcript snippet",
          url: null,
          metadata: {
            startTime: Number(snippetStartTime),
            snippet: snippetText.trim(),
          },
          createdAt: new Date().toISOString(),
        });
      }
      if (resolutionType === "DISCLOSED_ELSEWHERE") {
        evidencePayload.push({
          id: "",
          type: "DOCUMENT_LINK",
          label: evidenceLabel || "Disclosure evidence",
          url: evidenceUrl,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_REMEDIATION",
          resolutionType,
          rationale: rationale.trim(),
          dueDate: new Date(dueDate).toISOString(),
          sourceType:
            resolutionType === "DISCLOSED_ELSEWHERE" ? sourceType : undefined,
          disclosureDate:
            resolutionType === "DISCLOSED_ELSEWHERE"
              ? new Date(disclosureDate).toISOString()
              : undefined,
          acknowledgementStatus:
            resolutionType === "DISCLOSED_ELSEWHERE" ? ackStatus : undefined,
          followUpMethod:
            resolutionType === "FOLLOW_UP_REQUIRED"
              ? followUpMethod
              : undefined,
          planNote:
            resolutionType === "FOLLOW_UP_REQUIRED" ? planNote : undefined,
          requireAcknowledgement:
            resolutionType === "FOLLOW_UP_REQUIRED"
              ? requireAcknowledgement
              : undefined,
          evidence: evidencePayload.map((item) => ({
            type: item.type,
            label: item.label ?? undefined,
            url: item.url ?? undefined,
            metadata: item.metadata ?? undefined,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start remediation");
      }

      router.refresh();
      closeDrawer();
    } catch (error) {
      console.error("Failed to start remediation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!activeFlag?.resolutionRecord) return;
    setIsSaving(true);
    try {
      const metadata =
        evidenceType === "TRANSCRIPT_SNIPPET"
          ? {
              startTime: Number(snippetStartTime),
              snippet: snippetText.trim(),
            }
          : evidenceType === "NOTE"
            ? { note: snippetText.trim() }
            : null;

      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EVIDENCE",
          evidence: {
            type: evidenceType,
            label: evidenceLabel || undefined,
            url: evidenceUrl || undefined,
            metadata: metadata ?? undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add evidence");
      }

      setEvidenceLabel("");
      setEvidenceUrl("");
      setSnippetText("");
      router.refresh();
    } catch (error) {
      console.error("Failed to add evidence:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!activeFlag || !taskToComplete) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPLETE_TASK",
          taskId: taskToComplete.id,
          completionNote: taskNote.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to complete task");
      }

      router.refresh();
      setTaskDialogOpen(false);
      setTaskToComplete(null);
      setTaskNote("");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForVerification = async () => {
    if (!activeFlag) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_FOR_VERIFICATION" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit for verification");
      }
      router.refresh();
      closeDrawer();
    } catch (error) {
      console.error("Failed to submit for verification:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const [verificationNote, setVerificationNote] = useState("");

  const handleApprove = async () => {
    if (!activeFlag) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          note: verificationNote.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve remediation");
      }
      router.refresh();
      closeDrawer();
    } catch (error) {
      console.error("Failed to approve remediation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!activeFlag) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", note: rejectNote.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject remediation");
      }
      router.refresh();
      setRejectDialogOpen(false);
      setRejectNote("");
      closeDrawer();
    } catch (error) {
      console.error("Failed to reject remediation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverride = async () => {
    if (!activeFlag) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/flags/${activeFlag.id}/remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OVERRIDE",
          reason: overrideReason.trim(),
          category: overrideCategory.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept risk");
      }
      router.refresh();
      setOverrideDialogOpen(false);
      setOverrideReason("");
      setOverrideCategory("");
      closeDrawer();
    } catch (error) {
      console.error("Failed to accept risk:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be saved",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {renderFlagCards ? (
        <div className="space-y-3">
          {renderFlagCards({
            openRemediation: openDrawer,
            openAcceptRisk: openOverrideDialog,
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Requires Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {flags.map((flag) => {
              const nextTask = flag.resolutionRecord?.tasks.find(
                (task) => task.required && task.status !== "COMPLETED",
              );
              return (
                <div
                  key={flag.id}
                  id={`flag-${flag.id}`}
                  className="rounded-md border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getSeverityVariant(flag.severity)}>
                      {flag.severity}
                    </Badge>
                    <Badge variant="outline">
                      {flag.type.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant={getStatusVariant(flag.status)}>
                      {formatStatusLabel(flag.status)}
                    </Badge>
                  </div>
                  {flag.evidence?.recommendation?.text ? (
                    <div className="text-sm">
                      <span className="font-medium">Recommendation:</span>{" "}
                      {flag.evidence.recommendation.text}
                    </div>
                  ) : null}
                  {flag.evidence?.recommendation?.snippet ? (
                    <div className="text-xs text-muted-foreground">
                      “{flag.evidence.recommendation.snippet}”
                    </div>
                  ) : null}
                  {flag.type === "MISSING_DISCLOSURE" &&
                  flag.evidence?.matchedCategories ? (
                    <MissingDisclosureCategoryNote evidence={flag.evidence} />
                  ) : null}
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span className="font-medium text-foreground">
                        Next action:
                      </span>{" "}
                      {getNextAction(flag)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Owner:
                      </span>{" "}
                      {nextTask
                        ? nextTask.ownerId === currentUserId
                          ? "You"
                          : nextTask.ownerId.slice(0, 6)
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Due:</span>{" "}
                      {nextTask
                        ? new Date(nextTask.dueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  {flag.resolutionRecord ? (
                    <div className="text-xs text-muted-foreground">
                      Resolution:{" "}
                      {resolutionLabels[flag.resolutionRecord.resolutionType] ||
                        "In progress"}{" "}
                      • Evidence: {flag.resolutionRecord.evidence.length} item
                      {flag.resolutionRecord.evidence.length === 1 ? "" : "s"}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reviewEvidence(flag)}
                    >
                      Review evidence
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scrollToClaim(flag)}
                    >
                      View claim
                    </Button>
                    {flag.status === "OPEN" && (
                      <Button size="sm" onClick={() => openDrawer(flag)}>
                        Start remediation
                      </Button>
                    )}
                    {flag.status !== "OPEN" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openDrawer(flag)}
                      >
                        Manage remediation
                      </Button>
                    )}
                    {userRole === "OWNER_CCO" && flag.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openOverrideDialog(flag)}
                      >
                        Accept risk
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(flag.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Drawer open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className="sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle>
              {activeFlag?.status === "OPEN"
                ? "Start remediation"
                : "Remediation workflow"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-6 overflow-y-auto max-h-[70vh]">
            {activeFlag?.status === "OPEN" ? (
              <>
                <div className="space-y-2">
                  <Label>Resolution type</Label>
                  <Select
                    value={resolutionType}
                    onValueChange={setResolutionType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADD_CONTEXT">Add context</SelectItem>
                      <SelectItem value="DISCLOSED_ELSEWHERE">
                        Disclosed elsewhere
                      </SelectItem>
                      <SelectItem value="FOLLOW_UP_REQUIRED">
                        Follow-up required
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rationale</Label>
                  <Textarea
                    value={rationale}
                    onChange={(event) => setRationale(event.target.value)}
                    placeholder="Explain why this remediation path is appropriate"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Owner due date</Label>
                  <Input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>

                {resolutionType === "ADD_CONTEXT" && (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium">Transcript evidence</p>
                    <div className="space-y-2">
                      <Label>Snippet start time (seconds)</Label>
                      <Input
                        value={snippetStartTime}
                        onChange={(event) =>
                          setSnippetStartTime(event.target.value)
                        }
                        placeholder="Click a transcript segment to auto-fill"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Snippet text</Label>
                      <Textarea
                        value={snippetText}
                        onChange={(event) => setSnippetText(event.target.value)}
                        placeholder="Paste the disclosure snippet"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Evidence label</Label>
                      <Input
                        value={evidenceLabel}
                        onChange={(event) =>
                          setEvidenceLabel(event.target.value)
                        }
                        placeholder="Optional label"
                      />
                    </div>
                  </div>
                )}

                {resolutionType === "DISCLOSED_ELSEWHERE" && (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium">Disclosure source</p>
                    <div className="space-y-2">
                      <Label>Source type</Label>
                      <Input
                        value={sourceType}
                        onChange={(event) => setSourceType(event.target.value)}
                        placeholder="ADV, brochure, agreement, email, portal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Disclosure date</Label>
                      <Input
                        type="datetime-local"
                        value={disclosureDate}
                        onChange={(event) =>
                          setDisclosureDate(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Acknowledgement status</Label>
                      <Select value={ackStatus} onValueChange={setAckStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YES">Acknowledged</SelectItem>
                          <SelectItem value="NO">Not acknowledged</SelectItem>
                          <SelectItem value="UNKNOWN">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Evidence link</Label>
                      <Input
                        value={evidenceUrl}
                        onChange={(event) => setEvidenceUrl(event.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}

                {resolutionType === "FOLLOW_UP_REQUIRED" && (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium">Follow-up plan</p>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Input
                        value={followUpMethod}
                        onChange={(event) =>
                          setFollowUpMethod(event.target.value)
                        }
                        placeholder="Email, call, portal, letter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plan note</Label>
                      <Textarea
                        value={planNote}
                        onChange={(event) => setPlanNote(event.target.value)}
                        placeholder="Describe the plan and timeline"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Acknowledgement required</Label>
                      <Select
                        value={requireAcknowledgement ? "YES" : "NO"}
                        onValueChange={(value) =>
                          setRequireAcknowledgement(value === "YES")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select requirement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YES">Yes</SelectItem>
                          <SelectItem value="NO">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {activeFlag?.resolutionRecord ? (
              <div className="space-y-4">
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {resolutionLabels[
                      activeFlag.resolutionRecord.resolutionType
                    ] || "Remediation"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeFlag.resolutionRecord.rationale}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tasks</Label>
                  <div className="space-y-2">
                    {activeTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No tasks yet.
                      </p>
                    ) : (
                      activeTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 border rounded-md p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(task.dueDate).toLocaleDateString()}{" "}
                              • {task.status.replace(/_/g, " ").toLowerCase()}
                            </p>
                          </div>
                          {task.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTaskToComplete(task);
                                setTaskDialogOpen(true);
                              }}
                            >
                              Mark complete
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evidence</Label>
                  <div className="space-y-2">
                    {activeEvidence.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No evidence linked yet.
                      </p>
                    ) : (
                      activeEvidence.map((item) => (
                        <div
                          key={item.id}
                          className="text-xs text-muted-foreground border rounded-md p-2"
                        >
                          <div className="font-medium text-foreground">
                            {item.label ||
                              item.type.replace(/_/g, " ").toLowerCase()}
                          </div>
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {item.url}
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-medium">Add evidence</p>
                  <div className="space-y-2">
                    <Label>Evidence type</Label>
                    <Select
                      value={evidenceType}
                      onValueChange={setEvidenceType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select evidence type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSCRIPT_SNIPPET">
                          Transcript snippet
                        </SelectItem>
                        <SelectItem value="DOCUMENT_LINK">
                          Document link
                        </SelectItem>
                        <SelectItem value="OUTREACH_PROOF">
                          Outreach proof
                        </SelectItem>
                        <SelectItem value="ACKNOWLEDGEMENT">
                          Acknowledgement
                        </SelectItem>
                        <SelectItem value="NOTE">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={evidenceLabel}
                      onChange={(event) => setEvidenceLabel(event.target.value)}
                      placeholder="Optional label"
                    />
                  </div>
                  {evidenceType !== "NOTE" && (
                    <div className="space-y-2">
                      <Label>Evidence link</Label>
                      <Input
                        value={evidenceUrl}
                        onChange={(event) => setEvidenceUrl(event.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {(evidenceType === "TRANSCRIPT_SNIPPET" ||
                    evidenceType === "NOTE") && (
                    <>
                      {evidenceType === "TRANSCRIPT_SNIPPET" && (
                        <div className="space-y-2">
                          <Label>Snippet start time (seconds)</Label>
                          <Input
                            value={snippetStartTime}
                            onChange={(event) =>
                              setSnippetStartTime(event.target.value)
                            }
                            placeholder="Click a transcript segment to auto-fill"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>
                          {evidenceType === "NOTE" ? "Note" : "Snippet text"}
                        </Label>
                        <Textarea
                          value={snippetText}
                          onChange={(event) =>
                            setSnippetText(event.target.value)
                          }
                          placeholder="Add context for this evidence"
                        />
                      </div>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={handleAddEvidence}
                    disabled={isSaving || !evidenceFormValid}
                  >
                    Add evidence
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={closeDrawer} disabled={isSaving}>
              Close
            </Button>
            {activeFlag?.status === "OPEN" ? (
              <Button
                onClick={handleStartRemediation}
                disabled={
                  isSaving ||
                  rationale.trim().length < 50 ||
                  !dueDate ||
                  (resolutionType === "ADD_CONTEXT" &&
                    (!snippetStartTime || !snippetText.trim())) ||
                  (resolutionType === "DISCLOSED_ELSEWHERE" &&
                    (!sourceType || !disclosureDate || !evidenceUrl)) ||
                  (resolutionType === "FOLLOW_UP_REQUIRED" &&
                    (!followUpMethod || planNote.trim().length < 50))
                }
              >
                {isSaving ? "Starting..." : "Start remediation"}
              </Button>
            ) : null}
            {activeFlag?.status === "IN_REMEDIATION" ? (
              <Button
                onClick={handleSubmitForVerification}
                disabled={isSaving || requiredTasksIncomplete || !evidenceReady}
              >
                {isSaving ? "Submitting..." : "Submit for verification"}
              </Button>
            ) : null}
            {activeFlag?.status === "PENDING_VERIFICATION" &&
            userRole === "OWNER_CCO" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  aria-label="Verification rationale"
                  placeholder="Explain what evidence you verified and why the concern can be closed (minimum 20 characters)"
                  value={verificationNote}
                  onChange={(event) => setVerificationNote(event.target.value)}
                />
                <Button
                  onClick={handleApprove}
                  disabled={isSaving || verificationNote.trim().length < 20}
                >
                  Approve remediation
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isSaving}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete task</DialogTitle>
            <DialogDescription>
              Add completion notes for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Completion note</Label>
            <Textarea
              value={taskNote}
              onChange={(event) => setTaskNote(event.target.value)}
              placeholder="Describe what was completed and reference the evidence (minimum 20 characters)"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteTask}
              disabled={isSaving || taskNote.trim().length < 20}
            >
              {isSaving ? "Saving..." : "Mark complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject remediation</DialogTitle>
            <DialogDescription>
              Provide a reason to send back to the assignee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection note</Label>
            <Textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Explain what is missing"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSaving || rejectNote.trim().length < 10}
            >
              {isSaving ? "Submitting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept risk</DialogTitle>
            <DialogDescription>
              Provide justification and category for audit review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Risk category</Label>
            <Input
              value={overrideCategory}
              onChange={(event) => setOverrideCategory(event.target.value)}
              placeholder="e.g., Client unreachable"
            />
          </div>
          <div className="space-y-2">
            <Label>Justification</Label>
            <Textarea
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why risk is accepted"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOverrideDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverride}
              disabled={
                isSaving ||
                overrideReason.trim().length < 20 ||
                overrideCategory.trim().length < 2
              }
            >
              {isSaving ? "Submitting..." : "Accept risk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
