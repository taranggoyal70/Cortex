import type { Metadata } from "next";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { ExportPanel } from "@/components/export-panel";
import { requireWorkspace } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getApprovedSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Export" };

export default async function ExportPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const approved = await getApprovedSkills(ctx.workspaceId);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">Export the brain</h1>
        <p className="mt-1 text-sm text-muted">
          {approved.length} approved skill{approved.length === 1 ? "" : "s"} compiled
          into an executable skills file an AI agent can load. Only approved versions
          are included.
        </p>
      </div>

      {approved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="text-sm text-muted">
            Approve at least one skill in Review to build an export.
          </p>
        </div>
      ) : (
        <ExportPanel appUrl={getServerEnv().NEXT_PUBLIC_APP_URL} />
      )}
    </main>
  );
}
