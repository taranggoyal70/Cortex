import { recordAuditEvent } from "@/lib/audit";
import { requireWorkspace } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { exchangeCode, saveInstallation } from "@/lib/slack";

function backTo(status: string) {
  const base = getServerEnv().NEXT_PUBLIC_APP_URL;
  return Response.redirect(`${base}/settings/connections?slack=${status}`, 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error") || !code || !state) {
    return backTo("error");
  }

  try {
    const ctx = await requireWorkspace();

    // Verify the state decrypts to the current workspace (CSRF guard).
    let stateWorkspace: string;
    try {
      stateWorkspace = decryptSecret(state);
    } catch {
      return backTo("error");
    }
    if (stateWorkspace !== ctx.workspaceId) return backTo("error");

    const installation = await exchangeCode(code);
    await saveInstallation({
      workspaceId: ctx.workspaceId,
      installedBy: ctx.userId,
      ...installation,
    });
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      action: "slack.connected",
      resourceType: "connector_account",
      resourceId: installation.teamId,
      metadata: { teamName: installation.teamName },
    });
    return backTo("connected");
  } catch {
    return backTo("error");
  }
}
