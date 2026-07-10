import type { Metadata, Route } from "next";
import Link from "next/link";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { ScenarioRunner } from "@/components/scenario-runner";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getApprovedSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage() {
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
  const examples = approved
    .map((s) => s.body.triggers[0])
    .filter((t): t is string => Boolean(t))
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-[820px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-paper">Use it</h1>
        <p className="mt-1 text-sm text-muted">
          Give an agent a real situation. It picks the matching skill from your
          approved brain, follows the steps and decision rules, respects the
          guardrails, and cites the exact source — or defers to a human when
          nothing matches.
        </p>
      </div>

      {approved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="text-sm text-muted">
            Approve at least one skill to run the demo.
          </p>
          <Link
            href={"/review" as Route}
            className="mt-4 inline-flex rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink"
          >
            Go to Review
          </Link>
        </div>
      ) : (
        <ScenarioRunner examples={examples} />
      )}
    </main>
  );
}
