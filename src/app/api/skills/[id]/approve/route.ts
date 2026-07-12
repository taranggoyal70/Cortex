import { z } from "zod";

import { requireWorkspaceAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { skillLifecycle } from "@/lib/skill-lifecycle-db";

const schema = z.object({ versionId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWorkspaceAdmin();
    const { id } = await context.params;
    const { versionId } = schema.parse(await request.json());
    await skillLifecycle.approve({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      skillId: id,
      versionId,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
