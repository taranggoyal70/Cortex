import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { extractionRuns } from "@/db/schema";
import { AppError } from "@/lib/errors";

export async function createRun(input: {
  workspaceId: string;
  createdBy: string;
  sourceIds: string[];
  trigger: string;
}) {
  const [run] = await getDb()
    .insert(extractionRuns)
    .values({
      workspaceId: input.workspaceId,
      createdBy: input.createdBy,
      sourceIds: input.sourceIds,
      trigger: input.trigger,
      status: "queued",
    })
    .returning();
  return run;
}

export async function updateRun(
  runId: string,
  values: Partial<typeof extractionRuns.$inferInsert>,
) {
  await getDb()
    .update(extractionRuns)
    .set(values)
    .where(eq(extractionRuns.id, runId));
}

export async function getRun(workspaceId: string, runId: string) {
  const [run] = await getDb()
    .select()
    .from(extractionRuns)
    .where(
      and(
        eq(extractionRuns.id, runId),
        eq(extractionRuns.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!run) throw new AppError("Run not found.", 404, "run_not_found");
  return run;
}

export async function latestRun(workspaceId: string) {
  const [run] = await getDb()
    .select()
    .from(extractionRuns)
    .where(eq(extractionRuns.workspaceId, workspaceId))
    .orderBy(desc(extractionRuns.createdAt))
    .limit(1);
  return run ?? null;
}
