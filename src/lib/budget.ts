import "server-only";

import { Redis } from "@upstash/redis";

import { getServerEnv } from "@/lib/env";

// App-wide daily cap on GitHub Models calls (the free tier is ~150/day shared
// across the whole app). Uses an Upstash counter keyed by the UTC date so it
// resets at midnight UTC. If Upstash is not configured we fail open but log —
// the model provider's own 429 is the backstop.

function todayKey() {
  const now = new Date();
  const date = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  return `cortex:model-budget:${date}`;
}

let redis: Redis | null | undefined;

function getRedis() {
  if (redis !== undefined) return redis;
  const env = getServerEnv();
  redis =
    env.KV_REST_API_URL && env.KV_REST_API_TOKEN
      ? new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
      : null;
  return redis;
}

/**
 * Atomically reserve one model call against today's budget. Returns whether
 * the call is allowed and the remaining budget. Increments first, then checks,
 * so concurrent callers cannot both slip past the cap.
 */
export async function reserveModelCall(): Promise<{
  allowed: boolean;
  used: number;
  budget: number;
}> {
  const env = getServerEnv();
  const budget = env.CORTEX_DAILY_MODEL_BUDGET;
  const client = getRedis();
  if (!client) {
    // No counter available — allow, provider 429 is the safety net.
    return { allowed: true, used: 0, budget };
  }
  const key = todayKey();
  const used = await client.incr(key);
  if (used === 1) {
    // First call today — expire the counter after 48h so it self-cleans.
    await client.expire(key, 60 * 60 * 48);
  }
  if (used > budget) {
    // Roll back the reservation we couldn't honor.
    await client.decr(key);
    return { allowed: false, used: used - 1, budget };
  }
  return { allowed: true, used, budget };
}

export async function getBudgetStatus(): Promise<{ used: number; budget: number }> {
  const env = getServerEnv();
  const budget = env.CORTEX_DAILY_MODEL_BUDGET;
  const client = getRedis();
  if (!client) return { used: 0, budget };
  const used = (await client.get<number>(todayKey())) ?? 0;
  return { used: Number(used), budget };
}
