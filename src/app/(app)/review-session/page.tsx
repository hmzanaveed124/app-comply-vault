import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { listAuthorisedFirmWorkspaceIds } from "~/server/supervision/portfolio";
import { FirmRecordLink } from "./firm-record-link";
import { PilotMeasurement } from "./pilot-measurement";

export const dynamic = "force-dynamic";

export default async function ReviewSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const firmIds = await listAuthorisedFirmWorkspaceIds(db, session.user.id);
  if (!firmIds.length)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Daily review</h1>
        <p>
          Daily supervisory review requires an active compliance membership.
          Adviser meeting certification is available in{" "}
          <Link className="underline" href="/review">
            Meeting drafts
          </Link>
          .
        </p>
      </div>
    );
  const params = await searchParams;
  const raw =
    typeof params.cutoff === "string" ? new Date(params.cutoff) : new Date();
  const cutoff =
    Number.isNaN(raw.valueOf()) || raw > new Date() ? new Date() : raw;
  const from = new Date(cutoff.getTime() - 86400000);
  const period = { gte: from, lte: cutoff };
  const scope = { workspaceId: { in: firmIds } };
  const [
    firms,
    observations,
    processedMeetings,
    processedEmails,
    samples,
    held,
    failedJobs,
    pendingMeetings,
    measurements,
  ] = await Promise.all([
    db.workspace.findMany({
      where: { id: { in: firmIds } },
      select: {
        id: true,
        name: true,
        mediaPosture: true,
        legalHold: true,
        integrationCredentials: { select: { provider: true, status: true } },
        mailboxConnections: {
          where: { deletedAt: null },
          select: { status: true, lastSyncAt: true },
        },
      },
    }),
    db.flag.findMany({
      where: {
        ...scope,
        createdAt: { lte: cutoff },
        status: { in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"] },
      },
      include: {
        workspace: { select: { name: true } },
        meeting: {
          select: { clientName: true, status: true, meetingDate: true },
        },
        communication: { select: { threadId: true } },
        resolutionRecord: { include: { tasks: true } },
      },
      orderBy: [{ reviewDueAt: "asc" }, { createdAt: "asc" }],
      take: 200,
    }),
    db.meeting.count({ where: { ...scope, processedAt: period } }),
    db.communicationThread.count({ where: { ...scope, processedAt: period } }),
    db.meeting.findMany({
      where: {
        ...scope,
        processedAt: period,
        supervisoryOutcome: "ROUTINE_SAMPLE",
      },
      select: {
        id: true,
        workspaceId: true,
        clientName: true,
        workspace: { select: { name: true } },
      },
      take: 50,
    }),
    db.meeting.count({
      where: { ...scope, supervisoryOutcome: { in: ["HELD", "PARKED"] } },
    }),
    db.ingestJob.count({
      where: { ...scope, status: { in: ["FAILED", "PAUSED"] } },
    }),
    db.meeting.count({
      where: { ...scope, status: { in: ["DRAFT", "PROCESSING"] } },
    }),
    db.auditEvent.findMany({
      where: {
        ...scope,
        resourceType: "pilot_measurement",
        userId: session.user.id,
      },
      select: { id: true, timestamp: true, metadata: true },
      orderBy: { timestamp: "desc" },
      take: 5,
    }),
  ]);
  const total = processedMeetings + processedEmails;
  const blocked = firms.filter((f) => !f.mediaPosture).length;
  const verification = observations.filter(
    (f) => f.status === "PENDING_VERIFICATION",
  ).length;
  const overdue = observations.filter(
    (f) =>
      (f.reviewDueAt && f.reviewDueAt < cutoff) ||
      f.resolutionRecord?.tasks.some(
        (t) => t.required && t.status !== "COMPLETED" && t.dueDate < cutoff,
      ),
  ).length;
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Daily review</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Review one batch across your authorised firms. Processing continues as
          sources arrive; this page groups review work without treating AI
          observations as confirmed violations.
        </p>
        <p className="mt-2 text-xs">
          Activity window: {from.toISOString()} to {cutoff.toISOString()}.
          Unresolved work includes all earlier dates. Statuses reflect the
          current record.
        </p>
        <Link
          className="text-sm text-brand underline"
          href={`/review-session?cutoff=${encodeURIComponent(cutoff.toISOString())}`}
        >
          Keep this activity cutoff
        </Link>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Processed in 24h", total],
          [
            "Open observations / findings",
            observations.length >= 200 ? "200+" : observations.length,
          ],
          ["Awaiting verification", verification],
          ["Overdue follow-up", overdue],
        ].map(([label, count]) => (
          <div className="rounded-lg border bg-card p-4" key={label}>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Processing and coverage</h2>
        <p className="mt-2 text-sm">
          {blocked} firms blocked pending a media policy · {pendingMeetings}{" "}
          meetings in draft/processing · {failedJobs} failed/paused email ingest
          jobs · {held} held/parked meetings.
        </p>
        {total === 0 ? (
          <p className="mt-2 text-sm text-semantic-warning">
            No processed interactions in this activity window. An empty queue
            does not establish that sources were captured or reviewed.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3 text-sm">
          {firms.map((f) => (
            <li key={f.id}>
              <strong>{f.name}</strong>:{" "}
              {f.mediaPosture
                ? `media policy ${f.mediaPosture.toLowerCase()}`
                : "ingestion blocked: media decision required"}
              {f.legalHold ? " · legal hold active" : ""}
              <p className="text-xs text-text-secondary">
                {f.integrationCredentials.length
                  ? f.integrationCredentials
                      .map((i) => `${i.provider}: ${i.status}`)
                      .join(" · ")
                  : "No integration credentials recorded"}
                .{" "}
                {f.mailboxConnections
                  .map(
                    (m) =>
                      `Mailbox ${m.status}; last sync ${m.lastSyncAt?.toISOString() ?? "never"}`,
                  )
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-secondary">
          A connected integration does not prove complete source coverage or
          successful archive delivery. Check the source and delivery record
          before relying on it.
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Outstanding review and remediation
        </h2>
        <p className="mb-3 text-sm text-text-secondary">
          Includes baseline and legacy observations that have not entered the
          Priority Inbox. Group by firm and client during review; certification
          and remediation are separate steps.
        </p>
        {observations.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["Firm / client", "Concern", "Status", "Next action"].map(
                    (h) => (
                      <th className="p-3" key={h}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {observations.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="p-3">
                      {f.workspace.name}
                      <br />
                      {f.meeting?.clientName ?? "Email interaction"}
                    </td>
                    <td className="p-3">
                      {f.type === "MISSING_DISCLOSURE"
                        ? "Disclosure evidence to review"
                        : f.type.replaceAll("_", " ")}
                      <br />
                      <span className="text-xs">
                        {f.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </td>
                    <td className="p-3">{f.status.replaceAll("_", " ")}</td>
                    <td className="p-3">
                      <FirmRecordLink
                        workspaceId={f.workspaceId}
                        href={
                          f.meetingId
                            ? `/meetings/${f.meetingId}`
                            : f.communication?.threadId
                              ? `/communications/threads/${f.communication.threadId}`
                              : "/communications"
                        }
                      >
                        {f.status === "PENDING_VERIFICATION"
                          ? "Verify completion"
                          : f.status === "IN_REMEDIATION"
                            ? "Manage follow-up"
                            : "Review evidence and applicability"}
                      </FirmRecordLink>
                      {f.resolutionRecord?.tasks
                        .filter((t) => t.required && t.status !== "COMPLETED")
                        .map((t) => (
                          <p key={t.id} className="text-xs">
                            {t.title} · owner{" "}
                            {t.ownerId === session.user.id ? "You" : t.ownerId}{" "}
                            · due {t.dueDate.toISOString().slice(0, 10)}
                          </p>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border p-4">
            No outstanding observations in accessible firms. Check processing
            coverage above.
          </p>
        )}
        {observations.length >= 200 ? (
          <p className="mt-2 text-sm">
            Showing the oldest 200 items. Use firm review pages for the
            remaining backlog.
          </p>
        ) : null}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Routine samples processed in this batch
        </h2>
        <p className="text-sm text-text-secondary">
          Sample selection follows the existing firm sampling configuration. A
          sample needs a human review; its presence here does not certify
          completion.
        </p>
        <ul className="mt-2 space-y-1">
          {samples.map((m) => (
            <li key={m.id}>
              <FirmRecordLink
                workspaceId={m.workspaceId}
                href={`/meetings/${m.id}`}
              >
                {m.workspace.name} · {m.clientName}
              </FirmRecordLink>
            </li>
          ))}
        </ul>
        {!samples.length ? (
          <p className="mt-2 text-sm">
            No meeting samples in this window. Email samples remain accessible
            in Supervision.
          </p>
        ) : null}
      </section>
      <PilotMeasurement workspaceId={session.user.workspaceId!} />
      <section>
        <h2 className="font-semibold">Recent pilot measurements</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {measurements.map((m) => {
            const v = m.metadata as {
              caseLabel?: string;
              baselineMinutes?: number;
              reviewMinutes?: number;
              setupMinutes?: number;
              reworkMinutes?: number;
            };
            return (
              <li key={m.id}>
                {m.timestamp.toISOString().slice(0, 10)} · {v.caseLabel} ·
                baseline {v.baselineMinutes} min · review {v.reviewMinutes} min
                · setup {v.setupMinutes} min · rework {v.reworkMinutes} min
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
