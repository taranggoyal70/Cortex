import { requireWorkspaceAdmin } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";
import { deleteSource } from "@/lib/sources";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    await deleteSource(ctx.workspaceId, id);
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "source.deleted",
      resourceType: "source",
      resourceId: id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
