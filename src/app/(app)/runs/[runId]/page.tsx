import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RunProgress } from "@/components/run-progress";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getRun } from "@/lib/runs";

export const metadata: Metadata = { title: "Extraction run" };

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const ctx = await requireWorkspace();
  const { runId } = await params;
  let run;
  try {
    run = await getRun(ctx.workspaceId, runId);
  } catch (error) {
    if (error instanceof AppError && error.code === "run_not_found") notFound();
    throw error;
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-paper">Extraction</h1>
      <RunProgress
        initialRun={{
          id: run.id,
          status: run.status,
          batchCount: run.batchCount,
          batchesDone: run.batchesDone,
          proposedSkillCount: run.proposedSkillCount,
          conflictCount: run.conflictCount,
          modelCallsUsed: run.modelCallsUsed,
          error: run.error,
        }}
      />
    </main>
  );
}
