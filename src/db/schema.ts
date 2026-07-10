import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { SkillBody } from "@/lib/domain/skill";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const sourceType = pgEnum("source_type", [
  "paste",
  "upload",
  "slack",
  "seed",
]);
export const sourceStatus = pgEnum("source_status", [
  "raw",
  "chunked",
  "extracted",
  "error",
]);
export const runStatus = pgEnum("run_status", [
  "queued",
  "running",
  "partial",
  "completed",
  "failed",
]);
export const skillStatus = pgEnum("skill_status", [
  "proposed",
  "approved",
  "archived",
]);
export const versionState = pgEnum("version_state", [
  "draft",
  "approved",
  "superseded",
]);
export const conflictKind = pgEnum("conflict_kind", [
  "contradiction",
  "duplicate",
  "staleness",
]);
export const conflictStatus = pgEnum("conflict_status", [
  "open",
  "resolved",
  "dismissed",
]);

// ── Users (mirrored from Clerk) ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Workspaces (thin — Clerk org is the source of truth) ──────────────────────

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(), // Clerk org_id
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sampleSeeded: boolean("sample_seeded").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Sources (raw ingested knowledge, immutable) ───────────────────────────────

export type SourceOrigin = {
  filename?: string;
  channel?: string;
  ts?: string;
  author?: string;
  url?: string;
};

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    type: sourceType("type").notNull(),
    status: sourceStatus("status").default("raw").notNull(),
    title: text("title").notNull(),
    origin: jsonb("origin").$type<SourceOrigin>().default({}).notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    bytes: integer("bytes").default(0).notNull(),
    connectorAccountId: uuid("connector_account_id"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sources_workspace_idx").on(table.workspaceId),
    uniqueIndex("sources_workspace_hash_uidx").on(
      table.workspaceId,
      table.contentHash,
    ),
  ],
);

// ── Source chunks (citation anchors) ──────────────────────────────────────────

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    tokenEstimate: integer("token_estimate").default(0).notNull(),
  },
  (table) => [
    index("source_chunks_workspace_idx").on(table.workspaceId),
    index("source_chunks_source_idx").on(table.sourceId),
    uniqueIndex("source_chunks_source_ordinal_uidx").on(
      table.sourceId,
      table.ordinal,
    ),
  ],
);

// ── Skills (living head) ──────────────────────────────────────────────────────

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    status: skillStatus("status").default("proposed").notNull(),
    currentVersionId: uuid("current_version_id"),
    ownerHint: text("owner_hint"),
    confidence: numeric("confidence"),
    isStale: boolean("is_stale").default(false).notNull(),
    staleReason: text("stale_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("skills_workspace_idx").on(table.workspaceId),
    uniqueIndex("skills_workspace_slug_uidx").on(table.workspaceId, table.slug),
  ],
);

// ── Skill versions (immutable content) ────────────────────────────────────────

export const skillVersions = pgTable(
  "skill_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    version: integer("version").notNull(),
    state: versionState("state").default("draft").notNull(),
    body: jsonb("body").$type<SkillBody>().notNull(),
    extractionRunId: uuid("extraction_run_id"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    createdBy: text("created_by").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("skill_versions_workspace_idx").on(table.workspaceId),
    index("skill_versions_skill_idx").on(table.skillId),
    uniqueIndex("skill_versions_skill_version_uidx").on(
      table.skillId,
      table.version,
    ),
  ],
);

// ── Citations (provenance with verified quotes) ───────────────────────────────

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    skillVersionId: uuid("skill_version_id")
      .notNull()
      .references(() => skillVersions.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull(),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => sourceChunks.id, { onDelete: "restrict" }),
    sourceId: uuid("source_id").notNull(),
    claimPath: text("claim_path").notNull(),
    quote: text("quote").notNull(),
    quoteVerified: boolean("quote_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("citations_workspace_idx").on(table.workspaceId),
    index("citations_version_idx").on(table.skillVersionId),
  ],
);

// ── Conflicts ─────────────────────────────────────────────────────────────────

export type ConflictSide = {
  quote?: string;
  chunkId?: string;
  sourceId?: string;
  claimPath?: string;
  detail?: string;
};

export const conflicts = pgTable(
  "conflicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    skillId: uuid("skill_id"),
    kind: conflictKind("kind").notNull(),
    summary: text("summary").notNull(),
    status: conflictStatus("status").default("open").notNull(),
    sideA: jsonb("side_a").$type<ConflictSide>(),
    sideB: jsonb("side_b").$type<ConflictSide>(),
    detectedByRunId: uuid("detected_by_run_id"),
    resolvedBy: text("resolved_by"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("conflicts_workspace_idx").on(table.workspaceId)],
);

// ── Extraction runs (durable jobs) ────────────────────────────────────────────

export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    status: runStatus("status").default("queued").notNull(),
    trigger: text("trigger").default("manual").notNull(),
    workflowRunId: text("workflow_run_id"),
    sourceIds: jsonb("source_ids").$type<string[]>().default([]).notNull(),
    batchCount: integer("batch_count").default(0).notNull(),
    batchesDone: integer("batches_done").default(0).notNull(),
    modelCallsUsed: integer("model_calls_used").default(0).notNull(),
    candidateCount: integer("candidate_count").default(0).notNull(),
    proposedSkillCount: integer("proposed_skill_count").default(0).notNull(),
    conflictCount: integer("conflict_count").default(0).notNull(),
    error: text("error"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("extraction_runs_workspace_idx").on(table.workspaceId)],
);

// ── Connector accounts (Slack, etc.) ──────────────────────────────────────────

export const connectorAccounts = pgTable(
  "connector_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    provider: text("provider").notNull(),
    externalTeamId: text("external_team_id").notNull(),
    accessTokenEnc: text("access_token_enc").notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    botUserId: text("bot_user_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    installedBy: text("installed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("connector_accounts_workspace_idx").on(table.workspaceId),
    uniqueIndex("connector_accounts_workspace_provider_team_uidx").on(
      table.workspaceId,
      table.provider,
      table.externalTeamId,
    ),
  ],
);

// ── API tokens (agent pull) ───────────────────────────────────────────────────

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    prefix: text("prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("api_tokens_workspace_idx").on(table.workspaceId),
    uniqueIndex("api_tokens_hash_uidx").on(table.tokenHash),
  ],
);

// ── Audit logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workspaceId: text("workspace_id"),
    userId: text("user_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_workspace_idx").on(table.workspaceId)],
);
