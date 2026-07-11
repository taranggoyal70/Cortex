import { requireWorkspace } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { toErrorResponse } from "@/lib/errors";
import { installUrl } from "@/lib/slack";

// Kick off the Slack OAuth install. State is the encrypted workspaceId so the
// callback can prove the install belongs to the workspace that started it.
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    const state = encryptSecret(ctx.workspaceId);
    return Response.redirect(installUrl(state), 302);
  } catch (error) {
    return toErrorResponse(error);
  }
}
