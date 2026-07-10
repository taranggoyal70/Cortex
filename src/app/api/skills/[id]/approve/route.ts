import { z } from "zod";

import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { approveSkillVersion } from "@/lib/skills";

const schema = z.object({ versionId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    const { versionId } = schema.parse(await request.json());
    await approveSkillVersion({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      skillId: id,
      versionId,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "skill.approved",
      resourceType: "skill",
      resourceId: id,
      metadata: { versionId },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
