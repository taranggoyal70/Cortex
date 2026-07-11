import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { disconnectSlack } from "@/lib/slack";

export async function POST() {
  try {
    const ctx = await requireWorkspaceAdmin();
    await disconnectSlack(ctx.workspaceId);
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "slack.disconnected",
      resourceType: "connector_account",
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
