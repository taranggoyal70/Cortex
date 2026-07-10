import { requireWorkspace } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { getRun } from "@/lib/runs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const ctx = await requireWorkspace();
    const { runId } = await context.params;
    const run = await getRun(ctx.workspaceId, runId);
    return Response.json({ run });
  } catch (error) {
    return toErrorResponse(error);
  }
}
