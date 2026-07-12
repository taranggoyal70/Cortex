import { requireWorkspaceAdmin } from "@/lib/auth";
import { editSkillSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";
import { skillLifecycle } from "@/lib/skill-lifecycle-db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    const { body } = editSkillSchema.parse(await request.json());
    const version = await skillLifecycle.edit({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      skillId: id,
      body,
    });
    return Response.json({ ok: true, versionId: version.versionId });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    await skillLifecycle.archive({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      skillId: id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
