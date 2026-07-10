import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { revokeApiToken } from "@/lib/api-token";
import { toErrorResponse } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    await revokeApiToken(ctx.workspaceId, id);
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "token.revoked",
      resourceType: "api_token",
      resourceId: id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
