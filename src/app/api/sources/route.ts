import { requireWorkspace } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { ingestPasteSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ingestSource, listSources } from "@/lib/sources";

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    return Response.json({ sources: await listSources(ctx.workspaceId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspace();
    await enforceRateLimit({
      userId: ctx.workspaceId,
      action: "source-ingest",
      limit: 60,
      window: "1 h",
    });
    const input = ingestPasteSchema.parse(await request.json());
    const result = await ingestSource({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      type: input.type,
      title: input.title,
      content: input.content,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "source.ingested",
      resourceType: "source",
      resourceId: result.id,
      metadata: { deduped: result.deduped },
    });
    return Response.json(result, { status: result.deduped ? 200 : 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
