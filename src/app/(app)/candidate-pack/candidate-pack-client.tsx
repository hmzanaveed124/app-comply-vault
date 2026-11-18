"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "~/lib/toast";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  StatefulButton,
  pendingButtonState,
} from "~/components/ui/stateful-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import type { CandidatePackDto } from "~/server/candidate-pack/service";
import type {
  CoverageAnswerability,
  CoverageStatementItem,
  InterpretedScope,
} from "~/server/candidate-pack/types";
import { coverageStatusLabel } from "~/server/candidate-pack/types";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const payload = (await response.json()) as ApiResult<T>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(
      payload.error ?? "Could not complete the candidate-pack step.",
    );
  }
  return payload.data;
}

function statusChipClass(status: CoverageAnswerability): string {
  switch (status) {
    case "answerable":
      return "border-success-border bg-success-bg text-success-text";
    case "partially_answerable":
      return "border-warning-border bg-warning-bg text-warning-text";
    case "missing":
      return "border-rose-300 bg-rose-50 text-rose-950";
    case "data_source_unavailable":
      return "border-warning-border bg-warning-bg text-warning-text";
    case "excluded_by_request":
      return "border-surface-border bg-surface-muted text-text-primary";
    case "requires_manual_confirmation":
      return "border-brand/40 bg-brand/10 text-brand";
    default:
      return "";
  }
}

function packStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT_SCOPE":
      return "Needs your confirmation";
    case "SCOPE_CONFIRMED":
      return "Scope confirmed — ready to generate";
    case "GENERATED":
      return "Candidate evidence ready for review";
    case "APPROVED":
      return "Approved for export use";
    default:
      return status.replaceAll("_", " ");
  }
}

function ScopeList({
  label,
  values,
  empty = "None",
}: {
  label: string;
  values: string[];
  empty?: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">
        {values.length ? values.join(", ") : empty}
      </p>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CoverageItemCard({
  item,
  emphasizeGaps,
}: {
  item: CoverageStatementItem;
  emphasizeGaps: boolean;
}): React.JSX.Element {
  const isGap =
    item.label === "Coverage gap" ||
    item.status === "partially_answerable" ||
    item.status === "data_source_unavailable" ||
    item.status === "missing";

  return (
    <div
      className={`rounded-lg border p-3 ${
        item.status === "excluded_by_request"
          ? "border-surface-border bg-surface-muted"
          : item.status === "data_source_unavailable"
            ? "border-warning-border bg-warning-bg/60"
            : item.label === "Coverage gap" && emphasizeGaps
              ? "border-warning-border bg-warning-bg ring-2 ring-amber-200"
              : isGap && emphasizeGaps
                ? "border-warning-border bg-warning-bg/40"
                : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{item.label}</p>
        {item.label !== "Search population" ? (
          <Badge variant="outline" className={statusChipClass(item.status)}>
            {coverageStatusLabel(item.status)}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
      {item.missingPeriods && item.missingPeriods.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-warning-text">
          {item.missingPeriods.map((period) => (
            <li key={`${period.from}-${period.to}`} className="font-mono">
              {period.from} → {period.to}
            </li>
          ))}
        </ul>
      ) : null}
      {item.requestQuote ? (
        <p className="mt-1 text-xs italic text-muted-foreground">
          From request: “{item.requestQuote}”
        </p>
      ) : null}
    </div>
  );
}

export function CandidatePackClient({
  initialRequestText = "",
}: {
  initialRequestText?: string;
}): React.JSX.Element {
  const [requestText, setRequestText] = useState(initialRequestText);
  const [pack, setPack] = useState<CandidatePackDto | null>(null);
  const [scope, setScope] = useState<InterpretedScope | null>(null);
  const [pending, setPending] = useState<
    "draft" | "confirm" | "generate" | "approve" | null
  >(null);
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [attestOpen, setAttestOpen] = useState(false);
  const [ackLabels, setAckLabels] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scopeExpanded, setScopeExpanded] = useState(true);
  const [landOnGaps, setLandOnGaps] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const coverageRef = useRef<HTMLDivElement | null>(null);
  const autoDraftStarted = useRef(false);

  const coverage = pack?.coverageStatement ?? [];

  const includedCounts = useMemo(() => {
    const meetings =
      pack?.candidateRecords.filter(
        (r) => r.kind === "MEETING" && includedIds.has(r.id),
      ).length ?? 0;
    const emails =
      pack?.candidateRecords.filter(
        (r) => r.kind === "EMAIL" && includedIds.has(r.id),
      ).length ?? 0;
    return { meetings, emails, total: meetings + emails };
  }, [pack, includedIds]);

  function syncPack(data: CandidatePackDto): void {
    setPack(data);
    setScope(data.interpretedScope);
    if (data.candidateRecords.length > 0) {
      setIncludedIds(new Set(data.candidateRecords.map((r) => r.id)));
    }
    if (data.status !== "DRAFT_SCOPE") {
      setScopeExpanded(false);
    }
  }

  async function createDraft(text: string = requestText): Promise<void> {
    setPending("draft");
    try {
      const data = await requestJson<CandidatePackDto>("/api/candidate-pack", {
        method: "POST",
        body: JSON.stringify({ requestText: text }),
      });
      syncPack(data);
      setScopeExpanded(true);
      toast.success("Interpreted scope ready — confirm before generating.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create candidate scope.",
      );
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    if (!initialRequestText || autoDraftStarted.current) return;
    if (initialRequestText.trim().length < 10) return;
    autoDraftStarted.current = true;
    void createDraft(initialRequestText);
    // Demo cold-open: interpret once when arriving from the letter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRequestText]);

  async function confirmScope(): Promise<void> {
    if (!pack || !scope) return;
    setPending("confirm");
    setActionError(null);
    try {
      const data = await requestJson<CandidatePackDto>(
        `/api/candidate-pack/${pack.id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ scope }),
        },
      );
      syncPack(data);
      toast.success("Scope confirmed. You can generate candidate evidence.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not confirm candidate scope.";
      setActionError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  async function generate(): Promise<void> {
    if (!pack) return;
    setPending("generate");
    try {
      const data = await requestJson<CandidatePackDto>(
        `/api/candidate-pack/${pack.id}/generate`,
        { method: "POST" },
      );
      syncPack(data);
      setLandOnGaps(true);
      toast.success("Candidate evidence retrieved under the confirmed scope.");
      requestAnimationFrame(() => {
        coverageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate candidate pack.",
      );
    } finally {
      setPending(null);
    }
  }

  function openAttestation(): void {
    setAckLabels(new Set());
    setAttestOpen(true);
  }

  async function approve(): Promise<void> {
    if (!pack) return;
    setPending("approve");
    try {
      const data = await requestJson<CandidatePackDto>(
        `/api/candidate-pack/${pack.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            includedMeetingIds: pack.candidateRecords
              .filter((r) => r.kind === "MEETING" && includedIds.has(r.id))
              .map((r) => r.id),
            includedEmailEvidenceIds: pack.candidateRecords
              .filter((r) => r.kind === "EMAIL" && includedIds.has(r.id))
              .map((r) => r.id),
            acknowledgedCoverageLabels: coverage
              .filter((c) => ackLabels.has(coverageAckKey(c)))
              .map((c) => c.label),
          }),
        },
      );
      syncPack(data);
      setAttestOpen(false);
      setPreviewOpen(true);
      toast.success(
        "Candidate pack approved — attestation written to the audit log.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not approve candidate pack.",
      );
    } finally {
      setPending(null);
    }
  }

  function toggleIncluded(id: string): void {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAck(label: string): void {
    setAckLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function coverageAckKey(item: CoverageStatementItem): string {
    return `${item.label}::${item.detail}`;
  }

  const allAcked =
    coverage.length > 0 &&
    coverage.every((c) => ackLabels.has(coverageAckKey(c)));

  return (
    <div className="space-y-5">
      {!pack && !initialRequestText ? (
        <p className="text-sm text-muted-foreground">
          Prefer opening from the{" "}
          <Link
            href="/document-request"
            className="underline underline-offset-2"
          >
            inbound letter
          </Link>
          , or paste a request item below.
        </p>
      ) : null}

      {pack && !scopeExpanded && scope ? (
        <Card>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Confirmed scope
              </p>
              <p className="mt-1 text-sm text-foreground">
                {scope.people.join(", ") || "No people"} ·{" "}
                {scope.channels.join(", ")} · {scope.concepts.join(", ")} ·{" "}
                {scope.dateFrom ?? "—"} to {scope.dateTo ?? "—"}
                {scope.exclusions.length
                  ? ` · Excluding ${scope.exclusions.join(", ")}`
                  : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {pack.requestText}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-transparent bg-muted font-normal text-muted-foreground"
              >
                {packStatusLabel(pack.status)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScopeExpanded(true)}
              >
                Edit / view
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Request item</CardTitle>
              <CardDescription>Use one request item at a time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                placeholder="Paste a document-request item…"
                rows={5}
                disabled={Boolean(pack)}
                className="text-foreground placeholder:text-muted-foreground/70"
              />
              {!pack ? (
                <StatefulButton
                  onClick={() => void createDraft()}
                  state={pendingButtonState(pending === "draft")}
                  loadingText="Interpreting…"
                  disabled={
                    pending === "draft" || requestText.trim().length < 10
                  }
                >
                  Interpret candidate scope
                </StatefulButton>
              ) : null}
            </CardContent>
          </Card>

          {pack && scope ? (
            <Card className="border-brand/30">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Interpreted candidate scope</CardTitle>
                    <CardDescription>
                      Confirm we read the request correctly. Nothing generates
                      until you confirm.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      pack.status === "DRAFT_SCOPE"
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : "border-transparent bg-muted text-muted-foreground"
                    }
                  >
                    {packStatusLabel(pack.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <ScopeList label="People" values={scope.people} />
                <ScopeList
                  label="Entities"
                  values={scope.entities}
                  empty="None from this request"
                />
                <ScopeList label="Channels" values={scope.channels} />
                <ScopeList label="Concepts" values={scope.concepts} />
                <ScopeList
                  label="Exclusions (from request)"
                  values={scope.exclusions}
                  empty="None stated in the request"
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date range
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {scope.dateFrom ?? "Not interpreted"} to{" "}
                    {scope.dateTo ?? "Not interpreted"}
                  </p>
                </div>
                {pack.status === "DRAFT_SCOPE" ? (
                  <div className="md:col-span-2 space-y-2 border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                      <StatefulButton
                        className="bg-surface-strong hover:bg-surface-strong/90"
                        onClick={() => void confirmScope()}
                        state={pendingButtonState(pending === "confirm")}
                        loadingText="Confirming…"
                        disabled={pending === "confirm"}
                      >
                        Confirm candidate scope
                      </StatefulButton>
                      <p className="self-center text-xs text-muted-foreground">
                        This stores your confirmation in the audit log before any
                        retrieval.
                      </p>
                    </div>
                    {actionError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {actionError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {pack?.status === "SCOPE_CONFIRMED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Generate candidate evidence</CardTitle>
            <CardDescription>
              Retrieval uses only the confirmed scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatefulButton
              onClick={() => void generate()}
              state={pendingButtonState(pending === "generate")}
              loadingText="Generating…"
              disabled={pending === "generate"}
            >
              Generate candidate pack
            </StatefulButton>
          </CardContent>
        </Card>
      ) : null}

      {pack &&
      (pack.status === "GENERATED" || pack.status === "APPROVED") &&
      pack.candidateRecords ? (
        <Card className="border-brand/20 shadow-sm">
          <CardHeader>
            <div>
              <CardTitle>Candidate evidence</CardTitle>
              <CardDescription>
                {includedCounts.meetings} meeting
                {includedCounts.meetings === 1 ? "" : "s"},{" "}
                {includedCounts.emails} email
                {includedCounts.emails === 1 ? "" : "s"} selected for the pack.
                Review each row before approval.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {pack.candidateRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matches in the sources searched under the confirmed scope.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Include</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Record</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Hash</th>
                      <th className="px-3 py-2 font-medium">Why matched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.candidateRecords.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={includedIds.has(row.id)}
                            disabled={pack.status === "APPROVED"}
                            onChange={() => toggleIncluded(row.id)}
                            aria-label={`Include ${row.title}`}
                          />
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-muted-foreground">
                          {formatDate(row.occurredAt)}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <p className="font-medium text-foreground">
                            {row.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.kind === "MEETING" ? "Meeting" : "Email"} ·{" "}
                            {row.subtitle}
                          </p>
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {row.sourceSystem}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                          {row.hashPrefix ? `${row.hashPrefix}…` : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {row.matchReason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {pack?.coverageStatement ? (
        <div ref={coverageRef}>
          <Card
            className={landOnGaps ? "border-warning-border shadow-md" : undefined}
          >
            <CardHeader>
              <CardTitle>Coverage and gaps</CardTitle>
              <CardDescription>
                What was searched, what matched, and what this pack could not
                find — including holes you can defend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {(() => {
                const gapItems = pack.coverageStatement.filter(
                  (i) => i.label === "Coverage gap",
                );
                const searched = pack.coverageStatement.filter(
                  (i) =>
                    i.label !== "Coverage gap" &&
                    (i.label === "Search population" ||
                      i.status === "answerable" ||
                      i.status === "partially_answerable" ||
                      i.status === "missing" ||
                      i.status === "requires_manual_confirmation"),
                );
                const notSearched = pack.coverageStatement.filter(
                  (i) =>
                    i.status === "excluded_by_request" ||
                    i.status === "data_source_unavailable",
                );
                return (
                  <>
                    {gapItems.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-warning-text">
                          What it could not find
                        </p>
                        {gapItems.map((item) => (
                          <CoverageItemCard
                            key={`${item.label}-${item.detail}`}
                            item={item}
                            emphasizeGaps={landOnGaps}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Searched
                      </p>
                      {searched.map((item) => (
                        <CoverageItemCard
                          key={item.label}
                          item={item}
                          emphasizeGaps={landOnGaps}
                        />
                      ))}
                    </div>
                    {notSearched.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Not searched, and why
                        </p>
                        {notSearched.map((item) => (
                          <CoverageItemCard
                            key={item.label}
                            item={item}
                            emphasizeGaps={landOnGaps}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                );
              })()}

              {pack.status === "GENERATED" ? (
                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <Button
                    className="bg-surface-strong hover:bg-surface-strong/90"
                    onClick={openAttestation}
                    disabled={includedCounts.total === 0}
                  >
                    Approve candidate pack
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                  >
                    Preview pack
                  </Button>
                  {includedCounts.total === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nothing to approve yet — generate matches under a
                      confirmed scope first.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {pack.status === "APPROVED" ? (
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
                  <p className="font-medium text-brand">
                    Approved for export use
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Approved{" "}
                    {pack.approvedAt
                      ? new Date(pack.approvedAt).toLocaleString()
                      : ""}
                    {pack.approvedByUserId
                      ? ` · approver ${pack.approvedByUserId.slice(0, 8)}…`
                      : ""}
                    {pack.confirmedAt
                      ? ` · scope confirmed ${new Date(pack.confirmedAt).toLocaleString()}`
                      : ""}
                    {" · "}
                    {includedCounts.total} record
                    {includedCounts.total === 1 ? "" : "s"} · gaps acknowledged
                    in the audit log.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setPreviewOpen(true)}
                  >
                    Preview pack
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={attestOpen} onOpenChange={setAttestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attest and approve</DialogTitle>
            <DialogDescription>
              Approval records who approved, when, against which confirmed
              scope, how many records, and which gaps you acknowledged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">{includedCounts.total}</span>{" "}
              candidate record
              {includedCounts.total === 1 ? "" : "s"} selected (
              {includedCounts.meetings} meeting
              {includedCounts.meetings === 1 ? "" : "s"},{" "}
              {includedCounts.emails} email
              {includedCounts.emails === 1 ? "" : "s"}).
            </p>
            <p className="text-muted-foreground">
              Acknowledge each coverage item:
            </p>
            <ul className="space-y-2">
              {coverage.map((item) => {
                const key = coverageAckKey(item);
                return (
                  <li key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={ackLabels.has(key)}
                      onChange={() => toggleAck(key)}
                      id={`ack-${key}`}
                    />
                    <label htmlFor={`ack-${key}`} className="cursor-pointer">
                      <span className="font-medium">{item.label}</span>
                      <span className="block text-muted-foreground">
                        {item.detail}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttestOpen(false)}>
              Cancel
            </Button>
            <StatefulButton
              className="bg-surface-strong hover:bg-surface-strong/90"
              disabled={!allAcked || pending === "approve"}
              state={pendingButtonState(pending === "approve")}
              loadingText="Writing attestation…"
              onClick={() => void approve()}
            >
              Confirm approval
            </StatefulButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Candidate pack preview</DialogTitle>
            <DialogDescription>
              Static preview of what an examiner would receive. Labelled
              candidate — not a complete population claim.
            </DialogDescription>
          </DialogHeader>
          {pack ? (
            <div className="space-y-4 text-sm">
              <section className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Request
                </p>
                <p className="mt-1 whitespace-pre-wrap">{pack.requestText}</p>
              </section>
              {scope ? (
                <section className="rounded-lg border p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Confirmed scope
                  </p>
                  <p className="mt-1">
                    People: {scope.people.join(", ") || "—"}
                    <br />
                    Channels: {scope.channels.join(", ")}
                    <br />
                    Concepts: {scope.concepts.join(", ")}
                    <br />
                    Dates: {scope.dateFrom ?? "—"} → {scope.dateTo ?? "—"}
                    <br />
                    Exclusions:{" "}
                    {scope.exclusions.length
                      ? scope.exclusions.join(", ")
                      : "None"}
                  </p>
                </section>
              ) : null}
              <section className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Included records ({includedCounts.total})
                </p>
                <ul className="mt-2 space-y-1">
                  {pack.candidateRecords
                    .filter((r) => includedIds.has(r.id))
                    .map((r) => (
                      <li key={r.id}>
                        {formatDate(r.occurredAt)} · {r.kind} · {r.title} ·{" "}
                        {r.hashPrefix ? `${r.hashPrefix}…` : "no hash"}
                      </li>
                    ))}
                </ul>
              </section>
              {coverage.length ? (
                <section className="rounded-lg border p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Coverage
                  </p>
                  <ul className="mt-2 space-y-2">
                    {coverage.map((c) => (
                      <li key={`${c.label}-${c.detail}`}>
                        <span className="font-medium">{c.label}</span> —{" "}
                        {coverageStatusLabel(c.status)}. {c.detail}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {pack.status === "APPROVED" ? (
                <p className="text-xs text-muted-foreground">
                  Attestation stored as CANDIDATE_PACK_APPROVED on the audit
                  chain
                  {pack.approvedAt
                    ? ` at ${new Date(pack.approvedAt).toLocaleString()}`
                    : ""}
                  .
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
