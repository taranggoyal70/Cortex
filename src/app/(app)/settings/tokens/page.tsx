import type { Metadata } from "next";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { TokenManager } from "@/components/token-manager";
import { listApiTokens } from "@/lib/api-token";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "API tokens" };

export default async function TokensPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const rows = await listApiTokens(ctx.workspaceId);
  const tokens = rows.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
    revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">API tokens</h1>
        <p className="mt-1 text-sm text-muted">
          Tokens let an external agent pull this workspace&apos;s compiled skills from{" "}
          <code className="font-mono text-xs text-paper">/api/agent/skills</code>.
          {!ctx.isAdmin && " Only workspace admins can create or revoke tokens."}
        </p>
      </div>

      <TokenManager tokens={tokens} isAdmin={ctx.isAdmin} />
    </main>
  );
}
