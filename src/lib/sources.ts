import "server-only";

import { createHash } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { sourceChunks, sources, type SourceOrigin } from "@/db/schema";
import { chunkText } from "@/lib/chunking";
import { AppError } from "@/lib/errors";

export function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export async function ingestSource(input: {
  workspaceId: string;
  createdBy: string;
  type: "paste" | "upload" | "slack" | "seed";
  title: string;
  content: string;
  origin?: SourceOrigin;
}) {
  const db = getDb();
  const content = input.content.replace(/\r\n/g, "\n").trim();
  if (!content) {
    throw new AppError("Source content is empty.", 400, "empty_source");
  }
  const contentHash = hashContent(content);

  const [existing] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.contentHash, contentHash))
    .limit(1);
  if (existing) {
    // Idempotent: a byte-identical source is already ingested.
    return { id: existing.id, deduped: true };
  }

  const [source] = await db
    .insert(sources)
    .values({
      workspaceId: input.workspaceId,
      createdBy: input.createdBy,
      type: input.type,
      title: input.title.slice(0, 200),
      content,
      contentHash,
      bytes: Buffer.byteLength(content, "utf8"),
      origin: input.origin ?? {},
      status: "chunked",
    })
    .returning();

  const chunks = chunkText(content);
  if (chunks.length > 0) {
    await db.insert(sourceChunks).values(
      chunks.map((chunk) => ({
        sourceId: source.id,
        workspaceId: input.workspaceId,
        ordinal: chunk.ordinal,
        text: chunk.text,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        tokenEstimate: chunk.tokenEstimate,
      })),
    );
  }

  return { id: source.id, deduped: false, chunks: chunks.length };
}

export async function listSources(workspaceId: string) {
  return getDb()
    .select({
      id: sources.id,
      type: sources.type,
      status: sources.status,
      title: sources.title,
      bytes: sources.bytes,
      origin: sources.origin,
      createdAt: sources.createdAt,
    })
    .from(sources)
    .where(eq(sources.workspaceId, workspaceId))
    .orderBy(desc(sources.createdAt));
}

export async function deleteSource(workspaceId: string, sourceId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);
  if (!row) throw new AppError("Source not found.", 404, "source_not_found");
  // Chunks cascade; citations reference chunks with restrict, so a source
  // that already produced skills cannot be silently deleted mid-flight.
  await db.delete(sources).where(eq(sources.id, sourceId));
  void workspaceId;
}
