import { createHash } from "node:crypto";
import type { Prisma } from "../../../generated/prisma";
import { db } from "~/server/db";
import type { MissingDisclosureFlag } from "./missing-disclosure";

/** Reprocessing must never delete observations, dispositions or remediation. */
export async function persistDisclosureObservations(args: {
  workspaceId: string;
  meetingId: string;
  flags: MissingDisclosureFlag[];
}): Promise<void> {
  for (const flag of args.flags) {
    const rec = flag.evidence.recommendation;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([rec.text.trim(), rec.startTime, rec.endTime]))
      .digest("hex");
    const dedupeKey = `meeting:${args.meetingId}:disclosure:${fingerprint}`;
    // Older observations have no key. Preserve them rather than duplicating them.
    const existing = await db.flag.findMany({
      where: {
        workspaceId: args.workspaceId,
        meetingId: args.meetingId,
        type: flag.type,
      },
      select: { evidence: true },
    });
    if (
      existing.some((row) => {
        const evidence = row.evidence as unknown as
          MissingDisclosureFlag["evidence"] | null;
        return (
          evidence?.recommendation?.text?.trim() === rec.text.trim() &&
          evidence.recommendation.startTime === rec.startTime
        );
      })
    )
      continue;
    await db.flag.upsert({
      where: {
        workspaceId_dedupeKey: { workspaceId: args.workspaceId, dedupeKey },
      },
      update: {},
      create: {
        workspaceId: args.workspaceId,
        meetingId: args.meetingId,
        sourceType: "MEETING",
        sourceId: args.meetingId,
        dedupeKey,
        type: flag.type,
        severity: flag.severity,
        status: "OPEN",
        evidence: flag.evidence as unknown as Prisma.InputJsonValue,
        createdByType: "SYSTEM",
      },
    });
  }
}
