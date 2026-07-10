import { requireWorkspace } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { seedSampleCompany } from "@/lib/seed";

export async function POST() {
  try {
    const ctx = await requireWorkspace();
    await enforceRateLimit({
      userId: ctx.workspaceId,
      action: "seed",
      limit: 5,
      window: "1 h",
    });
    const result = await seedSampleCompany({
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "sources.seeded",
      resourceType: "source",
      metadata: result,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
