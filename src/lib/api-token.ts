import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { apiTokens } from "@/db/schema";
import { AppError } from "@/lib/errors";

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createApiToken(input: {
  workspaceId: string;
  createdBy: string;
  name: string;
}) {
  const raw = `cortex_sk_${randomBytes(24).toString("base64url")}`;
  const [row] = await getDb()
    .insert(apiTokens)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      tokenHash: hashToken(raw),
      prefix: raw.slice(0, 16),
      createdBy: input.createdBy,
    })
    .returning();
  // The plaintext token is returned exactly once.
  return { id: row.id, token: raw, prefix: row.prefix };
}

export async function listApiTokens(workspaceId: string) {
  return getDb()
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.workspaceId, workspaceId))
    .orderBy(desc(apiTokens.createdAt));
}

export async function revokeApiToken(workspaceId: string, id: string) {
  await getDb()
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.workspaceId, workspaceId)));
}

/** Resolve a bearer token to its workspace, or throw 401. */
export async function resolveApiToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Missing bearer token.", 401, "missing_token");
  }
  const raw = authorization.slice("Bearer ".length).trim();
  const db = getDb();
  const [row] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hashToken(raw)), isNull(apiTokens.revokedAt)))
    .limit(1);
  if (!row) throw new AppError("Invalid or revoked token.", 401, "invalid_token");
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, row.id));
  return { workspaceId: row.workspaceId, tokenId: row.id };
}
