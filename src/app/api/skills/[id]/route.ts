import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { editSkillSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";
import { archiveSkill, saveSkillEdit } from "@/lib/skills";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    const { body } = editSkillSchema.parse(await request.json());
    const version = await saveSkillEdit({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      skillId: id,
      body,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "skill.edited",
      resourceType: "skill",
      resourceId: id,
      metadata: { versionId: version.id },
    });
    return Response.json({ ok: true, versionId: version.id });
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
    await archiveSkill(ctx.workspaceId, id);
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "skill.archived",
      resourceType: "skill",
      resourceId: id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
