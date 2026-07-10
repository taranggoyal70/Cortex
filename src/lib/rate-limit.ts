import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  const key = `${limit}:${window}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  const env = getServerEnv();
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    throw new AppError(
      "Rate-limit storage is not configured.",
      503,
      "rate_limit_unavailable",
    );
  }

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
  const result = await getLimiter(input.limit, input.window).limit(
    `${input.action}:${input.userId}`,
  );

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
