import { requireWorkspace } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { listChannels } from "@/lib/slack";

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    return Response.json({ channels: await listChannels(ctx.workspaceId) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
