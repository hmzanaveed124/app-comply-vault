import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { contextualControlSchema } from "~/lib/contextual-control";
import { getCategoryBySlug } from "~/lib/disclosure-categories";
import { getWorkspaceMembership } from "~/server/firm-profile/workspace-access";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; slug: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, slug } = await params;
  const access = await getWorkspaceMembership(session.user.id, workspaceId);
  if (!access.ok || access.role !== "OWNER_CCO")
    return Response.json(
      { error: "Only the firm's CCO can configure controls" },
      { status: 403 },
    );
  if (!getCategoryBySlug(slug))
    return Response.json({ error: "Unknown control" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const parsed = contextualControlSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid control" },
      { status: 422 },
    );
  const profile = await db.firmProfile.findFirst({
    where: { workspaceId, deletedAt: null, status: "ACTIVE" },
  });
  if (!profile)
    return Response.json(
      { error: "Complete the firm profile first" },
      { status: 409 },
    );
  const category = await db.disclosureCategory.findUnique({
    where: { firmProfileId_slug: { firmProfileId: profile.id, slug } },
  });
  if (!category)
    return Response.json({ error: "Control not found" }, { status: 404 });
  await db.$transaction(async (tx) => {
    await tx.disclosureCategory.update({
      where: { id: category.id },
      data: { controlConfig: parsed.data },
    });
    await tx.firmProfile.update({
      where: { id: profile.id },
      data: { approvedAt: null, approvedByUserId: null },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId,
        userId: session.user.id,
        action: "EDIT",
        resourceType: "firm_profile",
        resourceId: profile.id,
        metadata: {
          action: "contextual_control_updated",
          slug,
          previous: category.controlConfig,
          next: parsed.data,
          requiresReapproval: true,
        },
      },
    });
  });
  return Response.json({ success: true });
}
