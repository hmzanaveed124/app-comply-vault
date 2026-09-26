/**
 * Internal Stack Assessments inspector
 * Auth-gated by OPS_ALLOWED_EMAILS (same as /internal/ops)
 */

import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { env } from "~/env";
import { db } from "~/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Prisma } from "../../../../../generated/prisma";
import {
  effectiveFunnelStatus,
  summarizeFunnel,
} from "~/server/assessment/funnel";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isOpsAllowed(email: string | null | undefined): boolean {
  const allowed = env.OPS_ALLOWED_EMAILS;
  if (!allowed?.trim()) return false;
  const emails = allowed.split(",").map((e) => e.trim().toLowerCase());
  return email ? emails.includes(email.toLowerCase()) : false;
}

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function gapsFromSummary(summary: Prisma.JsonValue | null): string {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return "—";
  }
  const record = summary as Record<string, unknown>;
  const gaps = record.gaps;
  if (!Array.isArray(gaps) || gaps.length === 0) return "—";
  return gaps
    .slice(0, 3)
    .map((gap) => {
      if (!gap || typeof gap !== "object") return null;
      const title = (gap as Record<string, unknown>).title;
      return typeof title === "string" ? title : null;
    })
    .filter(Boolean)
    .join(" · ");
}

function headlineFromSummary(summary: Prisma.JsonValue | null): string {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return "—";
  }
  const headline = (summary as Record<string, unknown>).headline;
  return typeof headline === "string" ? headline : "—";
}

export default async function InternalAssessmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  if (!isOpsAllowed(session.user.email)) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view stack assessment activity.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const filter = firstParam(params.filter) ?? "all";
  const source = firstParam(params.source)?.trim().toLowerCase() ?? "";

  const assessments = await db.stackAssessment.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
    include: {
      lead: {
        select: {
          email: true,
          firmName: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  const funnel = summarizeFunnel(assessments);

  const filtered = assessments.filter((row) => {
    const effective = effectiveFunnelStatus({
      status: row.status,
      lastActivityAt: row.lastActivityAt,
    });

    if (filter === "completed") {
      if (row.status !== "COMPLETED" && row.status !== "LEAD_CAPTURED") return false;
    } else if (filter === "lead") {
      if (row.status !== "LEAD_CAPTURED" && !row.lead) return false;
    } else if (filter === "incomplete") {
      if (row.status !== "STARTED" && row.status !== "IN_PROGRESS") return false;
    } else if (filter === "stale") {
      if (effective !== "ABANDONED") return false;
    }

    if (source) {
      const haystack = [
        row.utmSource,
        row.utmMedium,
        row.utmCampaign,
        row.referrer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(source)) return false;
    }

    return true;
  });

  const filterHref = (nextFilter: string): string => {
    const q = new URLSearchParams();
    if (nextFilter !== "all") q.set("filter", nextFilter);
    if (source) q.set("source", source);
    const qs = q.toString();
    return qs ? `/internal/assessments?${qs}` : "/internal/assessments";
  };

  return (
    <div className="container max-w-6xl py-8">
      <h1 className="mb-2 text-2xl font-semibold">Stack Assessments</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Latest 200 RIA Compliance Stack Assessment sessions. Lead emails are only
        visible here to OPS_ALLOWED_EMAILS. Stale/incomplete ("ABANDONED" in the
        UI) is derived from last activity (7 days default) — it is not a
        persisted database status and does not rely on browser close events.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Starts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{funnel.starts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {funnel.completions}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({Math.round(funnel.completionRate * 100)}%)
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {funnel.leadCaptures}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({Math.round(funnel.leadConversionRate * 100)}% of completions)
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stale incomplete</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {funnel.staleIncomplete}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Drop-off by step (incomplete)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Step 1: {funnel.dropOffByStep[0] ?? 0} · Step 2: {funnel.dropOffByStep[1] ?? 0} ·
          Step 3: {funnel.dropOffByStep[2] ?? 0} · Step 4: {funnel.dropOffByStep[3] ?? 0}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["completed", "Completed"],
            ["lead", "Lead captured"],
            ["incomplete", "Incomplete"],
            ["stale", "Stale"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={filterHref(value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-6 flex flex-wrap gap-2" method="get">
        {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
        <input
          name="source"
          defaultValue={source}
          placeholder="Filter source (linkedin, utm, referrer…)"
          className="min-w-[260px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Apply source filter
        </button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            Activity ({filtered.length}
            {filtered.length !== assessments.length
              ? ` of ${assessments.length}`
              : ""}
            )
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No assessments match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Created</th>
                    <th className="py-2 pr-3 font-medium">Last activity</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Result</th>
                    <th className="py-2 pr-3 font-medium">Major gaps</th>
                    <th className="py-2 pr-3 font-medium">Lead</th>
                    <th className="py-2 pr-3 font-medium">Attribution</th>
                    <th className="py-2 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const effective = effectiveFunnelStatus({
                      status: row.status,
                      lastActivityAt: row.lastActivityAt,
                    });
                    return (
                      <tr key={row.id} className="border-b align-top">
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {row.startedAt.toISOString().slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {row.lastActivityAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant="secondary">{effective}</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Stored: {row.status} · Step {row.currentStep + 1}/4
                            {row.completedAt ? " · completed" : ""}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-medium">{row.score ?? "—"}/100</div>
                          <div className="max-w-[220px] text-xs text-muted-foreground">
                            {headlineFromSummary(row.resultSummary)}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[220px]">
                          {gapsFromSummary(row.resultSummary)}
                        </td>
                        <td className="py-3 pr-3">
                          {row.lead ? (
                            <>
                              <div>{row.lead.email}</div>
                              <div className="text-xs text-muted-foreground">
                                {[row.lead.firmName, row.lead.role]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div>{row.utmSource ?? "direct"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[row.utmMedium, row.utmCampaign].filter(Boolean).join(" / ") ||
                              "—"}
                          </div>
                          <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {row.referrer ?? "—"}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-xs">{row.id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
