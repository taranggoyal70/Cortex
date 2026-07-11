import { start } from "workflow/api";
import { z } from "zod";

import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createRun, updateRun } from "@/lib/runs";
import { syncChannel } from "@/lib/slack";
import { extractWorkflow } from "@/workflows/extract";

const schema = z.object({
  channelId: z.string().min(1),
  channelName: z.string().min(1).max(120),
});

// Pull a channel's history into a source, then kick off extraction over it.
export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspaceAdmin();
    await enforceRateLimit({
      userId: ctx.workspaceId,
      action: "slack-sync",
      limit: 20,
      window: "1 h",
    });
    const { channelId, channelName } = schema.parse(await request.json());

    const { sourceId, messageCount } = await syncChannel({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      channelId,
      channelName,
    });

    if (!sourceId) {
      throw new AppError(
        "That channel has no readable messages to sync.",
        400,
        "empty_channel",
      );
    }

    const run = await createRun({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      sourceIds: [sourceId],
      trigger: "slack-sync",
    });
    const workflowRun = await start(extractWorkflow, [
      {
        workspaceId: ctx.workspaceId,
        runId: run.id,
        createdBy: ctx.userId,
        sourceIds: [sourceId],
      },
    ]);
    await updateRun(run.id, { workflowRunId: workflowRun.runId });

    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "slack.synced",
      resourceType: "source",
      resourceId: sourceId,
      metadata: { channel: channelName, messages: messageCount },
    });

    return Response.json({ sourceId, messageCount, runId: run.id }, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
