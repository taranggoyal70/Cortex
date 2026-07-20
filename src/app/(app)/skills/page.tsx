import type { Metadata, Route } from "next";
import Link from "next/link";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { SkillsExplorer } from "@/components/skills-explorer";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { listSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const all = await listSkills(ctx.workspaceId);
  const skills = all.filter((s) => s.status !== "archived");

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">Skills</h1>
        <p className="mt-1 text-sm text-muted">
          The living map of how your company works. Each skill is a cited,
          versioned procedure an agent can run.
        </p>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="text-sm text-muted">
            No skills yet. Add sources and run extraction to build the map.
          </p>
          <Link
            href={"/sources" as Route}
            className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink"
          >
            Add sources
          </Link>
        </div>
      ) : (
        <SkillsExplorer
          skills={skills.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            category: s.category,
            status: s.status,
            confidence: s.confidence,
            isStale: s.isStale,
          }))}
        />
      )}
    </main>
  );
}
