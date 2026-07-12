import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import {
  auditLogs,
  citations,
  skills,
  skillVersions,
  sourceChunks,
} from "@/db/schema";
import {
  createSkillLifecycle,
  type SkillLifecycleStore,
  type VerifiedCitation,
} from "@/lib/skill-lifecycle";
import { getServerEnv } from "@/lib/env";
import { normalizeStoredSkillBody } from "@/lib/domain/skill";

function citationRows(input: {
  workspaceId: string;
  skillId: string;
  versionId: string;
  citations: VerifiedCitation[];
}) {
  return input.citations.map((citation) => ({
    workspaceId: input.workspaceId,
    skillVersionId: input.versionId,
    skillId: input.skillId,
    chunkId: citation.chunkId,
    sourceId: citation.sourceId,
    claimPath: citation.claimPath,
    quote: citation.quote,
    quoteVerified: true,
  }));
}

function lockSkill(db: Database, workspaceId: string, skillSlug: string) {
  const lockKey = `${workspaceId}:${skillSlug}`;
  return db.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
}

function supersedeApproved(db: Database, workspaceId: string, skillId: string) {
  return db
    .update(skillVersions)
    .set({ state: "superseded" })
    .where(
      and(
        eq(skillVersions.workspaceId, workspaceId),
        eq(skillVersions.skillId, skillId),
        eq(skillVersions.state, "approved"),
      ),
    );
}

function skillAudit(
  db: Database,
  input: {
    workspaceId: string;
    userId?: string;
    action: string;
    skillId: string;
    metadata?: Record<string, unknown>;
  },
) {
  return db.insert(auditLogs).values({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: input.action,
    resourceType: "skill",
    resourceId: input.skillId,
    metadata: input.metadata ?? {},
  });
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

const store: SkillLifecycleStore = {
  async findSkill(workspaceId, skillId) {
    const [skill] = await getDb()
      .select({ id: skills.id, slug: skills.slug })
      .from(skills)
      .where(and(eq(skills.workspaceId, workspaceId), eq(skills.id, skillId)))
      .limit(1);
    return skill ?? null;
  },

  async findSkillBySlug(workspaceId, slug) {
    const [skill] = await getDb()
      .select({ id: skills.id, slug: skills.slug })
      .from(skills)
      .where(and(eq(skills.workspaceId, workspaceId), eq(skills.slug, slug)))
      .limit(1);
    return skill ?? null;
  },

  async findVersion(workspaceId, skillId, versionId) {
    const [version] = await getDb()
      .select({ id: skillVersions.id, body: skillVersions.body })
      .from(skillVersions)
      .where(
        and(
          eq(skillVersions.workspaceId, workspaceId),
          eq(skillVersions.skillId, skillId),
          eq(skillVersions.id, versionId),
        ),
      )
      .limit(1);
    return version
      ? { ...version, body: normalizeStoredSkillBody(version.body) }
      : null;
  },

  async findSourceChunks(workspaceId, chunkIds) {
    if (chunkIds.length === 0) return [];
    return getDb()
      .select({
        id: sourceChunks.id,
        sourceId: sourceChunks.sourceId,
        text: sourceChunks.text,
      })
      .from(sourceChunks)
      .where(
        and(
          eq(sourceChunks.workspaceId, workspaceId),
          inArray(sourceChunks.id, chunkIds),
        ),
      );
  },

  async commitEdit(input) {
    const db = getDb();
    const versionId = randomUUID();
    const approvedAt = new Date();
    const nextVersion = sql<number>`(
      select coalesce(max(${skillVersions.version}), 0) + 1
      from ${skillVersions}
      where ${skillVersions.skillId} = ${input.skillId}
    )`;

    await db.batch([
      lockSkill(db, input.workspaceId, input.skillSlug),
      supersedeApproved(db, input.workspaceId, input.skillId),
      db.insert(skillVersions).values({
        id: versionId,
        skillId: input.skillId,
        workspaceId: input.workspaceId,
        version: nextVersion,
        state: "approved",
        body: input.body,
        createdBy: input.userId,
        approvedBy: input.userId,
        approvedAt,
      }),
      db.insert(citations).values(
        citationRows({
          workspaceId: input.workspaceId,
          skillId: input.skillId,
          versionId,
          citations: input.citations,
        }),
      ),
      db
        .update(skills)
        .set({
          name: input.body.name,
          category: input.body.category,
          status: "approved",
          currentVersionId: versionId,
          confidence: String(input.body.confidence),
          isStale: false,
          staleReason: null,
          updatedAt: approvedAt,
        })
        .where(
          and(
            eq(skills.workspaceId, input.workspaceId),
            eq(skills.id, input.skillId),
          ),
        ),
      skillAudit(db, {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "skill.edited",
        skillId: input.skillId,
        metadata: { versionId },
      }),
    ]);

    return { versionId };
  },

  async commitProposal(input) {
    const db = getDb();
    const env = getServerEnv();
    const skillId = input.existingSkillId ?? randomUUID();
    const versionId = randomUUID();
    const nextVersion = sql<number>`(
      select coalesce(max(${skillVersions.version}), 0) + 1
      from ${skillVersions}
      where ${skillVersions.skillId} = ${skillId}
    )`;
    const versionInsert = db.insert(skillVersions).values({
      id: versionId,
      skillId,
      workspaceId: input.workspaceId,
      version: nextVersion,
      state: "draft",
      body: input.body,
      extractionRunId: input.runId,
      model: env.CORTEX_EXTRACT_MODEL,
      promptVersion: env.CORTEX_PROMPT_VERSION,
      createdBy: "extractor",
    });
    const citationInsert = db.insert(citations).values(
      citationRows({
        workspaceId: input.workspaceId,
        skillId,
        versionId,
        citations: input.citations,
      }),
    );
    const auditInsert = skillAudit(db, {
      workspaceId: input.workspaceId,
      action: "skill.proposed",
      skillId,
      metadata: { versionId, runId: input.runId },
    });

    if (input.existingSkillId) {
      await db.batch([
        lockSkill(db, input.workspaceId, input.body.slug),
        db
          .update(skills)
          .set({
            name: input.body.name,
            category: input.body.category,
            confidence: String(input.body.confidence),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(skills.workspaceId, input.workspaceId),
              eq(skills.id, skillId),
            ),
          ),
        versionInsert,
        citationInsert,
        auditInsert,
      ]);
    } else {
      try {
        await db.batch([
          lockSkill(db, input.workspaceId, input.body.slug),
          db.insert(skills).values({
            id: skillId,
            workspaceId: input.workspaceId,
            slug: input.body.slug,
            name: input.body.name,
            category: input.body.category,
            status: "proposed",
            confidence: String(input.body.confidence),
            ownerHint: input.body.owners[0]?.name ?? null,
          }),
          versionInsert,
          citationInsert,
          auditInsert,
        ]);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const [existing] = await db
          .select({ id: skills.id })
          .from(skills)
          .where(
            and(
              eq(skills.workspaceId, input.workspaceId),
              eq(skills.slug, input.body.slug),
            ),
          )
          .limit(1);
        if (!existing) throw error;
        return store.commitProposal({
          ...input,
          existingSkillId: existing.id,
        });
      }
    }

    return { skillId, versionId };
  },

  async commitApproval(input) {
    const db = getDb();
    const approvedAt = new Date();
    await db.batch([
      lockSkill(db, input.workspaceId, input.skillSlug),
      supersedeApproved(db, input.workspaceId, input.skillId),
      db
        .update(skillVersions)
        .set({
          state: "approved",
          approvedBy: input.userId,
          approvedAt,
        })
        .where(
          and(
            eq(skillVersions.workspaceId, input.workspaceId),
            eq(skillVersions.skillId, input.skillId),
            eq(skillVersions.id, input.versionId),
          ),
        ),
      db
        .delete(citations)
        .where(
          and(
            eq(citations.workspaceId, input.workspaceId),
            eq(citations.skillVersionId, input.versionId),
          ),
        ),
      db.insert(citations).values(
        citationRows({
          workspaceId: input.workspaceId,
          skillId: input.skillId,
          versionId: input.versionId,
          citations: input.citations,
        }),
      ),
      db
        .update(skills)
        .set({
          status: "approved",
          currentVersionId: input.versionId,
          isStale: false,
          staleReason: null,
          updatedAt: approvedAt,
        })
        .where(
          and(
            eq(skills.workspaceId, input.workspaceId),
            eq(skills.id, input.skillId),
          ),
        ),
      skillAudit(db, {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "skill.approved",
        skillId: input.skillId,
        metadata: { versionId: input.versionId },
      }),
    ]);
  },

  async commitArchive(input) {
    const db = getDb();
    await db.batch([
      lockSkill(db, input.workspaceId, input.skillSlug),
      db
        .update(skills)
        .set({ status: "archived", updatedAt: new Date() })
        .where(
          and(
            eq(skills.workspaceId, input.workspaceId),
            eq(skills.id, input.skillId),
          ),
        ),
      skillAudit(db, {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: "skill.archived",
        skillId: input.skillId,
      }),
    ]);
  },
};

export const skillLifecycle = createSkillLifecycle(store);
