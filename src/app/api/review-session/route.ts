import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getWorkspaceMembership } from "~/server/firm-profile/workspace-access";
const minutes = z.number().finite().min(0).max(100000);
const schema = z
  .object({
    workspaceId: z.string().min(1),
    caseLabel: z.string().trim().min(10).max(500),
    baselineMinutes: minutes,
    reviewMinutes: minutes,
    setupMinutes: minutes,
    reworkMinutes: minutes,
    itemsReviewed: z.number().int().min(1).max(100000),
    falsePositives: z.number().int().min(0),
    missedConcerns: z.number().int().min(0),
  })
  .refine(
    (v) =>
      v.falsePositives <= v.itemsReviewed &&
      v.missedConcerns <= v.itemsReviewed,
    "Issue counts cannot exceed reviewed items",
  );
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid measurement" },
      { status: 422 },
    );
  const { workspaceId, ...measurement } = parsed.data;
  const access = await getWorkspaceMembership(session.user.id, workspaceId);
  if (!access.ok)
    return Response.json(
      { error: "Compliance membership required" },
      { status: 403 },
    );
  await db.auditEvent.create({
    data: {
      workspaceId,
      userId: session.user.id,
      action: "EDIT",
      resourceType: "pilot_measurement",
      resourceId: crypto.randomUUID(),
      metadata: {
        ...measurement,
        measurementSource: "reviewer_entered",
        netMinutes:
          measurement.baselineMinutes -
          measurement.reviewMinutes -
          measurement.setupMinutes -
          measurement.reworkMinutes,
      },
    },
  });
  return Response.json({ success: true });
}
