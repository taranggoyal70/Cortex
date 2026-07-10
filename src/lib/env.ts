import "server-only";

import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  // GitHub Models (free tier) — one app-level token with models:read.
  GITHUB_MODELS_TOKEN: z.string().min(1),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CORTEX_EXTRACT_MODEL: z.string().min(1).default("openai/gpt-4.1"),
  CORTEX_PROMPT_VERSION: z.string().min(1).default("extract-v1"),
  CORTEX_DAILY_MODEL_BUDGET: z.coerce.number().int().positive().default(140),
  // Slack connector (optional until the connector is configured).
  SLACK_CLIENT_ID: z.string().min(1).optional(),
  SLACK_CLIENT_SECRET: z.string().min(1).optional(),
  // Encryption key for connector tokens at rest (32+ chars).
  CORTEX_ENCRYPTION_KEY: z.string().min(32).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    GITHUB_MODELS_TOKEN: process.env.GITHUB_MODELS_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CORTEX_EXTRACT_MODEL: process.env.CORTEX_EXTRACT_MODEL,
    CORTEX_PROMPT_VERSION: process.env.CORTEX_PROMPT_VERSION,
    CORTEX_DAILY_MODEL_BUDGET: process.env.CORTEX_DAILY_MODEL_BUDGET,
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
    CORTEX_ENCRYPTION_KEY: process.env.CORTEX_ENCRYPTION_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Invalid server configuration: ${z.prettifyError(result.error)}`,
    );
  }

  cached = result.data;
  return cached;
}
