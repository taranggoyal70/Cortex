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
import type { SkillBody } from "@/lib/domain/skill";
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
  const display =
    versions.find((v) => v.id === skill.currentVersionId) ?? versions[0] ?? null;

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
    versions,
    displayVersion: display
      ? { id: display.id, version: display.version, body: display.body }
      : null,
    citations: citeRows,
  };
}

export async function approveSkillVersion(input: {
  workspaceId: string;
  userId: string;
  skillId: string;
  versionId: string;
}) {
  const db = getDb();
  const [version] = await db
    .select()
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.id, input.versionId),
        eq(skillVersions.workspaceId, input.workspaceId),
        eq(skillVersions.skillId, input.skillId),
      ),
    )
    .limit(1);
  if (!version) throw new AppError("Version not found.", 404, "version_not_found");

  // Supersede any previously-approved version, approve this one.
  await db
    .update(skillVersions)
    .set({ state: "superseded" })
    .where(
      and(
        eq(skillVersions.skillId, input.skillId),
        eq(skillVersions.state, "approved"),
      ),
    );
  await db
    .update(skillVersions)
    .set({ state: "approved", approvedBy: input.userId, approvedAt: new Date() })
    .where(eq(skillVersions.id, input.versionId));
  await db
    .update(skills)
    .set({
      status: "approved",
      currentVersionId: input.versionId,
      isStale: false,
      staleReason: null,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, input.skillId));
}

export async function saveSkillEdit(input: {
  workspaceId: string;
  userId: string;
  skillId: string;
  body: SkillBody;
}) {
  const db = getDb();
  const [skill] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.id, input.skillId), eq(skills.workspaceId, input.workspaceId)))
    .limit(1);
  if (!skill) throw new AppError("Skill not found.", 404, "skill_not_found");

  const existing = await db
    .select({ version: skillVersions.version })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, input.skillId));
  const nextVersion =
    existing.reduce((max, v) => Math.max(max, v.version), 0) + 1;

  // A human edit creates a new approved version — it becomes the current one.
  const [version] = await db
    .insert(skillVersions)
    .values({
      skillId: input.skillId,
      workspaceId: input.workspaceId,
      version: nextVersion,
      state: "approved",
      body: input.body,
      createdBy: input.userId,
      approvedBy: input.userId,
      approvedAt: new Date(),
    })
    .returning();

  await db
    .update(skillVersions)
    .set({ state: "superseded" })
    .where(
      and(
        eq(skillVersions.skillId, input.skillId),
        eq(skillVersions.state, "approved"),
        eq(skillVersions.version, skill.currentVersionId ? nextVersion - 1 : -1),
      ),
    );

  await db
    .update(skills)
    .set({
      name: input.body.name,
      category: input.body.category,
      status: "approved",
      currentVersionId: version.id,
      confidence: String(input.body.confidence),
      isStale: false,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, input.skillId));

  return version;
}

export async function archiveSkill(workspaceId: string, skillId: string) {
  await getDb()
    .update(skills)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(skills.id, skillId), eq(skills.workspaceId, workspaceId)));
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
      return { ...row, citations: cites };
    }),
  );
  return enriched;
}
