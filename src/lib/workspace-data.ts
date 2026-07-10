import "server-only";

import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  conflicts,
  skills,
  sources,
  workspaces,
} from "@/db/schema";

export async function getWorkspaceOverview(workspaceId: string) {
  const db = getDb();
  const [
    [sourceRow],
    skillRows,
    [conflictRow],
    [staleRow],
    [workspaceRow],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(sources)
      .where(eq(sources.workspaceId, workspaceId)),
    db
      .select({ status: skills.status, value: count() })
      .from(skills)
      .where(eq(skills.workspaceId, workspaceId))
      .groupBy(skills.status),
    db
      .select({ value: count() })
      .from(conflicts)
      .where(
        and(
          eq(conflicts.workspaceId, workspaceId),
          eq(conflicts.status, "open"),
        ),
      ),
    db
      .select({ value: count() })
      .from(skills)
      .where(and(eq(skills.workspaceId, workspaceId), eq(skills.isStale, true))),
    db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
  ]);

  const byStatus = new Map(skillRows.map((r) => [r.status, r.value]));
  return {
    workspace: workspaceRow ?? null,
    sources: sourceRow?.value ?? 0,
    approvedSkills: byStatus.get("approved") ?? 0,
    proposedSkills: byStatus.get("proposed") ?? 0,
    totalSkills: skillRows.reduce((sum, r) => sum + r.value, 0),
    openConflicts: conflictRow?.value ?? 0,
    staleSkills: staleRow?.value ?? 0,
  };
}
