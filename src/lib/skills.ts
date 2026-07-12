import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  citations,
  conflicts,
  skills,
  skillVersions,
  sources,
} from "@/db/schema";
import {
  normalizeStoredSkillBody,
  type SkillBody,
} from "@/lib/domain/skill";
import { AppError } from "@/lib/errors";

export async function listSkills(workspaceId: string) {
  const rows = await getDb()
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      category: skills.category,
      status: skills.status,
      confidence: skills.confidence,
      isStale: skills.isStale,
      currentVersionId: skills.currentVersionId,
      updatedAt: skills.updatedAt,
    })
    .from(skills)
    .where(eq(skills.workspaceId, workspaceId))
    .orderBy(desc(skills.updatedAt));
  return rows;
}

export type SkillDetail = {
  skill: typeof skills.$inferSelect;
  versions: Array<{
    id: string;
    version: number;
    state: string;
    body: SkillBody;
    createdAt: Date;
    approvedAt: Date | null;
  }>;
  displayVersion: {
    id: string;
    version: number;
    body: SkillBody;
  } | null;
  citations: Array<{
    id: string;
    claimPath: string;
    quote: string;
    sourceId: string;
    sourceTitle: string | null;
  }>;
};

export async function getSkillDetail(
  workspaceId: string,
  skillId: string,
): Promise<SkillDetail> {
  const db = getDb();
  const [skill] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.workspaceId, workspaceId), eq(skills.id, skillId)))
    .limit(1);
  if (!skill) throw new AppError("Skill not found.", 404, "skill_not_found");

  const versions = await db
    .select({
      id: skillVersions.id,
      version: skillVersions.version,
      state: skillVersions.state,
      body: skillVersions.body,
      createdAt: skillVersions.createdAt,
      approvedAt: skillVersions.approvedAt,
    })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .orderBy(desc(skillVersions.version));

  // Show the approved current version if set, otherwise the latest draft.
  const normalizedVersions = versions.map((version) => ({
    ...version,
    body: normalizeStoredSkillBody(version.body),
  }));
  const display =
    normalizedVersions.find((v) => v.id === skill.currentVersionId) ??
    normalizedVersions[0] ??
    null;

  const citeRows = display
    ? await db
        .select({
          id: citations.id,
          claimPath: citations.claimPath,
          quote: citations.quote,
          sourceId: citations.sourceId,
          sourceTitle: sources.title,
        })
        .from(citations)
        .leftJoin(sources, eq(citations.sourceId, sources.id))
        .where(eq(citations.skillVersionId, display.id))
    : [];

  return {
    skill,
    versions: normalizedVersions,
    displayVersion: display
      ? { id: display.id, version: display.version, body: display.body }
      : null,
    citations: citeRows,
  };
}

export async function listOpenConflicts(workspaceId: string) {
  return getDb()
    .select()
    .from(conflicts)
    .where(
      and(eq(conflicts.workspaceId, workspaceId), eq(conflicts.status, "open")),
    )
    .orderBy(desc(conflicts.createdAt));
}

export async function resolveConflict(input: {
  workspaceId: string;
  userId: string;
  conflictId: string;
  resolution: "resolved" | "dismissed";
  note?: string;
}) {
  await getDb()
    .update(conflicts)
    .set({
      status: input.resolution,
      resolvedBy: input.userId,
      resolutionNote: input.note,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(conflicts.id, input.conflictId),
        eq(conflicts.workspaceId, input.workspaceId),
      ),
    );
}

/** Approved skills with resolved citation quotes — used by export + agent. */
export async function getApprovedSkills(workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select({
      skillId: skills.id,
      slug: skills.slug,
      versionId: skills.currentVersionId,
      body: skillVersions.body,
      version: skillVersions.version,
    })
    .from(skills)
    .innerJoin(skillVersions, eq(skills.currentVersionId, skillVersions.id))
    .where(and(eq(skills.workspaceId, workspaceId), eq(skills.status, "approved")));

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const cites = await db
        .select({
          claimPath: citations.claimPath,
          quote: citations.quote,
          sourceTitle: sources.title,
        })
        .from(citations)
        .leftJoin(sources, eq(citations.sourceId, sources.id))
        .where(eq(citations.skillVersionId, row.versionId ?? ""));
      return {
        ...row,
        body: normalizeStoredSkillBody(row.body),
        citations: cites,
      };
    }),
  );
  return enriched;
}
