import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspace, requireWorkspaceAdmin } from "@/lib/auth";
import { createApiToken, listApiTokens } from "@/lib/api-token";
import { createTokenSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    return Response.json({ tokens: await listApiTokens(ctx.workspaceId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { name } = createTokenSchema.parse(await request.json());
    const created = await createApiToken({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      name,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "token.created",
      resourceType: "api_token",
      resourceId: created.id,
    });
    // Plaintext token returned exactly once.
    return Response.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
