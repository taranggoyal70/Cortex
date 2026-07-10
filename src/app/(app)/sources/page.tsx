import type { Metadata } from "next";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { ExtractButton } from "@/components/extract-button";
import { SourceManager } from "@/components/source-manager";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { listSources } from "@/lib/sources";

export const metadata: Metadata = { title: "Sources" };

export default async function SourcesPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const sources = await listSources(ctx.workspaceId);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">Sources</h1>
          <p className="mt-1 text-sm text-muted">
            The raw, fragmented knowledge Cortex reads. Add it, then run
            extraction to build cited skills.
          </p>
        </div>
        {sources.length > 0 && <ExtractButton />}
      </div>

      <SourceManager
        sources={sources.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
        isAdmin={ctx.isAdmin}
      />
    </main>
  );
}
