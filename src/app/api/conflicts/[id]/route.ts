import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { resolveConflictSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";
import { resolveConflict } from "@/lib/skills";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    const { resolution, note } = resolveConflictSchema.parse(
      await request.json(),
    );
    await resolveConflict({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      conflictId: id,
      resolution,
      note,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "conflict.resolved",
      resourceType: "conflict",
      resourceId: id,
      metadata: { resolution },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
