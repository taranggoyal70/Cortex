import type { Metadata, Route } from "next";
import Link from "next/link";

import { ConflictResolver } from "@/components/conflict-resolver";
import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { CategoryBadge, ConfidenceBar } from "@/components/skill-badges";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { listOpenConflicts, listSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const [all, openConflicts] = await Promise.all([
    listSkills(ctx.workspaceId),
    listOpenConflicts(ctx.workspaceId),
  ]);
  const proposed = all.filter((s) => s.status === "proposed");

  return (
    <main className="mx-auto max-w-[900px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">Review</h1>
        <p className="mt-1 text-sm text-muted">
          Approve extracted skills into your skills file, and resolve conflicts
          where sources disagree.
        </p>
      </div>

      {openConflicts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-paper">
            Conflicts ({openConflicts.length})
          </h2>
          <div className="space-y-3">
            {openConflicts.map((c) => (
              <ConflictResolver
                key={c.id}
                conflict={{
                  id: c.id,
                  kind: c.kind,
                  summary: c.summary,
                  sideA: c.sideA,
                  sideB: c.sideB,
                }}
                isAdmin={ctx.isAdmin}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-paper">
          Proposed skills ({proposed.length})
        </h2>
        {proposed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
            Nothing awaiting review. Run extraction to propose skills.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {proposed.map((skill) => (
              <li key={skill.id}>
                <Link
                  href={`/skills/${skill.id}` as Route}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
                >
                  <CategoryBadge category={skill.category} />
                  <span className="flex-1 truncate text-sm font-medium text-paper">
                    {skill.name}
                  </span>
                  {skill.confidence && (
                    <ConfidenceBar value={Number(skill.confidence)} />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
