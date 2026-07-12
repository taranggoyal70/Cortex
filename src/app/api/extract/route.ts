import { start } from "workflow/api";
import { eq, and, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { sources } from "@/db/schema";
import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspace } from "@/lib/auth";
import { toErrorResponse, AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createRun, updateRun } from "@/lib/runs";
import { extractWorkflow } from "@/workflows/extract";

export async function POST() {
  try {
    const ctx = await requireWorkspace();
    await enforceRateLimit({
      userId: ctx.workspaceId,
      action: "extract",
      limit: 10,
      window: "1 h",
    });

    // Extract from every source in the workspace that still has content to map.
    const rows = await getDb()
      .select({ id: sources.id })
      .from(sources)
      .where(
        and(eq(sources.workspaceId, ctx.workspaceId), ne(sources.status, "error")),
      );
    const sourceIds = rows.map((r) => r.id);
    if (sourceIds.length === 0) {
      throw new AppError("Add sources before running extraction.", 400, "no_sources");
    }

    const run = await createRun({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      sourceIds,
      trigger: "manual",
    });

    const workflowRun = await start(extractWorkflow, [
      {
        workspaceId: ctx.workspaceId,
        runId: run.id,
        sourceIds,
      },
    ]);
    await updateRun(run.id, { workflowRunId: workflowRun.runId });

    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "extraction.started",
      resourceType: "extraction_run",
      resourceId: run.id,
      metadata: { sources: sourceIds.length },
    });

    return Response.json({ runId: run.id }, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
