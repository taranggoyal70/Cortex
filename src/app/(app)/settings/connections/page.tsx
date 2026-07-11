import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { SlackConnect } from "@/components/slack-connect";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getSlackConnection, slackConfigured } from "@/lib/slack";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const configured = slackConfigured();
  const connection = configured ? await getSlackConnection(ctx.workspaceId) : null;
  const teamName =
    (connection?.metadata as { teamName?: string } | undefined)?.teamName ?? null;

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">Connections</h1>
        <p className="mt-1 text-sm text-muted">
          Pull live knowledge from the tools your team already uses. Synced
          channels become sources you can extract skills from.
        </p>
      </div>

      <Suspense>
        <SlackConnect
          configured={configured}
          connected={Boolean(connection)}
          teamName={teamName}
          isAdmin={ctx.isAdmin}
        />
      </Suspense>
    </main>
  );
}
