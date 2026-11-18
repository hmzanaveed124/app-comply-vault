import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { topicToString } from "~/lib/topics";
import { redirectPathForMissingWorkspace } from "~/server/workspace/no-workspace-redirect";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ClientOverviewMeetingsTable } from "./client-overview-meetings-table";
import type { FlagStatus, Prisma } from "../../../../../generated/prisma";

// Reads searchParams for the client name, so it must render dynamically.
export const dynamic = "force-dynamic";

const OPEN_FLAG_STATUSES: readonly FlagStatus[] = [
  "OPEN",
  "IN_REMEDIATION",
  "PENDING_VERIFICATION",
];

export default async function ClientOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.JSX.Element> {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    if (!session?.user) {
      redirect("/auth/signin");
    }
    redirect(
      await redirectPathForMissingWorkspace(session.user.id, session.user.email),
    );
  }

  const params = await searchParams;
  const clientName =
    typeof params.name === "string" ? params.name.trim() : "";

  if (!clientName) {
    notFound();
  }

  const workspaceId = session.user.workspaceId;

  const where: Prisma.MeetingWhereInput = {
    workspaceId,
    clientName: { equals: clientName, mode: "insensitive" },
  };

  const meetings = await db.meeting.findMany({
    where,
    select: {
      id: true,
      clientName: true,
      meetingDate: true,
      meetingType: true,
      status: true,
      extraction: true,
      supervisoryOutcome: true,
      outcomeReason: true,
      flags: {
        where: { status: { in: [...OPEN_FLAG_STATUSES] } },
        select: { id: true },
      },
    },
    orderBy: { meetingDate: "desc" },
  });

  if (meetings.length === 0) {
    notFound();
  }

  // The stored casing may differ from the query string; prefer the real value.
  const displayName = meetings[0]?.clientName ?? clientName;

  const rows = meetings.map((meeting) => {
    const extraction = meeting.extraction as {
      topics?: string[];
      recommendations?: Array<{ text?: string }>;
    } | null;
    const keywords = (extraction?.topics ?? []).map(topicToString).join(", ");
    const hasRecommendations = (extraction?.recommendations?.length ?? 0) > 0;
    return {
      id: meeting.id,
      date: meeting.meetingDate.toISOString(),
      type: meeting.meetingType,
      keywords,
      hasRecommendations,
      isFinalized: meeting.status === "FINALIZED",
      supervisoryOutcome: meeting.supervisoryOutcome,
      outcomeReason: meeting.outcomeReason,
      openFlags: meeting.flags.length,
    };
  });

  const totalInteractions = rows.length;
  const finalizedCount = rows.filter((r) => r.isFinalized).length;
  const openFlags = rows.reduce((sum, r) => sum + r.openFlags, 0);
  const recommendationCount = rows.filter((r) => r.hasRecommendations).length;
  const lastMeeting = rows[0]?.date ?? null;

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            Clients
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-text-primary">{displayName}</span>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
          <Button variant="outline" asChild>
            <Link
              href={`/interaction-log?clientName=${encodeURIComponent(displayName)}`}
            >
              Open in interaction log
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          All supervised interactions attributed to this client in your workspace.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Interactions
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {totalInteractions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Finalized
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {finalizedCount}/{totalInteractions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Open flags
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{openFlags}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last meeting
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {lastMeeting ? dateFmt.format(new Date(lastMeeting)) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Interactions ({totalInteractions})
            {recommendationCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {recommendationCount} with recommendations
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientOverviewMeetingsTable rows={rows} />
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
