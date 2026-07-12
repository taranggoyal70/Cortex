import { z } from "zod";

// ── Citations ────────────────────────────────────────────────────────────────
// Every claim in a skill points at a source chunk with a verbatim quote. The
// extractor supplies chunkId + quote; the server verifies the quote is an
// actual substring of that chunk before the citation is trusted.

export const skillCitationRef = z.object({
  chunkId: z.string().min(1),
  quote: z.string().min(4).max(300),
});
export type SkillCitationRef = z.infer<typeof skillCitationRef>;

const skillTrigger = z.object({
  phrase: z.string().min(3).max(160),
  citations: z.array(skillCitationRef).max(4),
});

const skillOwner = z.object({
  name: z.string().max(120),
  citations: z.array(skillCitationRef).max(4),
});

export const skillCategory = z.enum([
  "support",
  "sales",
  "finance",
  "engineering",
  "hr",
  "legal",
  "ops",
  "security",
  "other",
]);
export type SkillCategory = z.infer<typeof skillCategory>;

// ── The SKILL body — the executable primitive ────────────────────────────────

export const skillBodySchema = z.object({
  name: z.string().min(3).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only")
    .max(80),
  category: skillCategory,
  // The trigger an agent matches a scenario against.
  whenToUse: z.string().min(10).max(400),
  whenToUseCitations: z.array(skillCitationRef).max(4),
  triggers: z.array(skillTrigger).min(1).max(8),
  steps: z
    .array(
      z.object({
        order: z.number().int().positive(),
        instruction: z.string().min(5).max(400),
        citations: z.array(skillCitationRef).max(4),
      }),
    )
    .min(1)
    .max(20),
  decisionRules: z
    .array(
      z.object({
        condition: z.string().min(3).max(300),
        action: z.string().min(3).max(300),
        citations: z.array(skillCitationRef).max(4),
      }),
    )
    .max(12),
  exceptions: z
    .array(
      z.object({
        situation: z.string().min(3).max(300),
        handling: z.string().min(3).max(300),
        citations: z.array(skillCitationRef).max(4),
      }),
    )
    .max(12),
  guardrails: z
    .array(
      z.object({
        rule: z.string().min(3).max(300),
        severity: z.enum(["must", "should"]),
        citations: z.array(skillCitationRef).max(4),
      }),
    )
    .max(12),
  owners: z.array(skillOwner).max(6),
  confidence: z.number().min(0).max(1),
  extractorNotes: z.string().max(500).nullable(),
});
export type SkillBody = z.infer<typeof skillBodySchema>;

/** Read pre-Citation-coverage Skill versions without weakening new writes. */
export function normalizeStoredSkillBody(value: unknown): SkillBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return skillBodySchema.parse(value);
  }
  const body = value as Record<string, unknown>;
  const triggers = Array.isArray(body.triggers)
    ? body.triggers.map((trigger) =>
        typeof trigger === "string"
          ? { phrase: trigger, citations: [] }
          : trigger,
      )
    : body.triggers;
  const owners = Array.isArray(body.owners)
    ? body.owners.map((owner) =>
        typeof owner === "string" ? { name: owner, citations: [] } : owner,
      )
    : body.owners;
  return skillBodySchema.parse({
    ...body,
    whenToUseCitations: body.whenToUseCitations ?? [],
    triggers,
    owners,
  });
}

// A contradiction the model detected between two sources on the same topic.
// Each side quotes its chunk verbatim so the server can verify it.
export const extractionConflictSchema = z.object({
  topic: z.string().min(3).max(160),
  skillSlug: z.string().max(80).nullable(),
  detail: z.string().min(3).max(300),
  sideA: skillCitationRef,
  sideB: skillCitationRef,
});
export type ExtractionConflict = z.infer<typeof extractionConflictSchema>;

// The model returns a batch of skills per extraction call, plus any
// cross-source contradictions it noticed while reading the chunks.
export const extractionBatchSchema = z.object({
  skills: z.array(skillBodySchema).max(15),
  conflicts: z.array(extractionConflictSchema).max(10),
});
export type ExtractionBatch = z.infer<typeof extractionBatchSchema>;

// ── The "use it" agent output ─────────────────────────────────────────────────

export const scenarioResultSchema = z.object({
  matched: z.boolean(),
  chosenSkillSlug: z.string().nullable(),
  handling: z.string().min(1).max(2000),
  appliedSteps: z.array(z.string().max(400)).max(20),
  appliedRules: z.array(z.string().max(400)).max(12),
  citations: z
    .array(
      z.object({
        skillSlug: z.string(),
        quote: z.string().max(300),
      }),
    )
    .max(12),
  guardrailsRespected: z.array(z.string().max(300)).max(12),
  deferToHuman: z.boolean(),
  deferReason: z.string().max(400).nullable(),
});
export type ScenarioResult = z.infer<typeof scenarioResultSchema>;

// ── Request schemas (API validation) ─────────────────────────────────────────

export const ingestPasteSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["paste", "upload"]).default("paste"),
  content: z.string().min(1).max(200_000),
});

export const editSkillSchema = z.object({
  body: skillBodySchema,
  note: z.string().max(500).optional(),
});

export const resolveConflictSchema = z.object({
  resolution: z.enum(["resolved", "dismissed"]),
  note: z.string().max(500).optional(),
});

export const createTokenSchema = z.object({
  name: z.string().min(1).max(80),
});

export const useScenarioSchema = z.object({
  scenario: z.string().min(4).max(2000),
});
