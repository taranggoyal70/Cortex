import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  const env = getServerEnv();
  // Rate limiting is best-effort: without Upstash configured we skip it
  // rather than blocking the whole app.
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null;

  const key = `${limit}:${window}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: new Redis({
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: "cortex",
  });
  limiters.set(key, limiter);
  return limiter;
}

export async function enforceRateLimit(input: {
  userId: string;
  action: string;
  limit: number;
  window: `${number} ${"s" | "m" | "h"}`;
}) {
  const limiter = getLimiter(input.limit, input.window);
  if (!limiter) return { success: true } as const;

  const result = await limiter.limit(`${input.action}:${input.userId}`);

  if (!result.success) {
    throw new AppError(
      "Too many requests. Try again shortly.",
      429,
      "rate_limited",
      {
        resetAt: result.reset,
      },
    );
  }

  return result;
}
