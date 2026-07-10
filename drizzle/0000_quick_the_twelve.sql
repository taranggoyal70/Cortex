CREATE TYPE "public"."conflict_kind" AS ENUM('contradiction', 'duplicate', 'staleness');--> statement-breakpoint
CREATE TYPE "public"."conflict_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'partial', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."skill_status" AS ENUM('proposed', 'approved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('raw', 'chunked', 'extracted', 'error');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('paste', 'upload', 'slack', 'seed');--> statement-breakpoint
CREATE TYPE "public"."version_state" AS ENUM('draft', 'approved', 'superseded');--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"skill_version_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"chunk_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"claim_path" text NOT NULL,
	"quote" text NOT NULL,
	"quote_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"skill_id" uuid,
	"kind" "conflict_kind" NOT NULL,
	"summary" text NOT NULL,
	"status" "conflict_status" DEFAULT 'open' NOT NULL,
	"side_a" jsonb,
	"side_b" jsonb,
	"detected_by_run_id" uuid,
	"resolved_by" text,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "connector_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_team_id" text NOT NULL,
	"access_token_enc" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bot_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"installed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"workflow_run_id" text,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"batch_count" integer DEFAULT 0 NOT NULL,
	"batches_done" integer DEFAULT 0 NOT NULL,
	"model_calls_used" integer DEFAULT 0 NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"proposed_skill_count" integer DEFAULT 0 NOT NULL,
	"conflict_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skill_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"version" integer NOT NULL,
	"state" "version_state" DEFAULT 'draft' NOT NULL,
	"body" jsonb NOT NULL,
	"extraction_run_id" uuid,
	"model" text,
	"prompt_version" text,
	"created_by" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" "skill_status" DEFAULT 'proposed' NOT NULL,
	"current_version_id" uuid,
	"owner_hint" text,
	"confidence" numeric,
	"is_stale" boolean DEFAULT false NOT NULL,
	"stale_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"text" text NOT NULL,
	"char_start" integer NOT NULL,
	"char_end" integer NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"type" "source_type" NOT NULL,
	"status" "source_status" DEFAULT 'raw' NOT NULL,
	"title" text NOT NULL,
	"origin" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"connector_account_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sample_seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_skill_version_id_skill_versions_id_fk" FOREIGN KEY ("skill_version_id") REFERENCES "public"."skill_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_chunk_id_source_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."source_chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_tokens_workspace_idx" ON "api_tokens" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_tokens_hash_uidx" ON "api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "citations_workspace_idx" ON "citations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "citations_version_idx" ON "citations" USING btree ("skill_version_id");--> statement-breakpoint
CREATE INDEX "conflicts_workspace_idx" ON "conflicts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "connector_accounts_workspace_idx" ON "connector_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_accounts_workspace_provider_team_uidx" ON "connector_accounts" USING btree ("workspace_id","provider","external_team_id");--> statement-breakpoint
CREATE INDEX "extraction_runs_workspace_idx" ON "extraction_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "skill_versions_workspace_idx" ON "skill_versions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "skill_versions_skill_idx" ON "skill_versions" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_versions_skill_version_uidx" ON "skill_versions" USING btree ("skill_id","version");--> statement-breakpoint
CREATE INDEX "skills_workspace_idx" ON "skills" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_workspace_slug_uidx" ON "skills" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "source_chunks_workspace_idx" ON "source_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "source_chunks_source_idx" ON "source_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunks_source_ordinal_uidx" ON "source_chunks" USING btree ("source_id","ordinal");--> statement-breakpoint
CREATE INDEX "sources_workspace_idx" ON "sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_workspace_hash_uidx" ON "sources" USING btree ("workspace_id","content_hash");