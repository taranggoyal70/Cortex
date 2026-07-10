// Deterministic chunking — no model call. Produces citation anchors with
// character offsets. Rough token estimate = chars / 4.

export type Chunk = {
  ordinal: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenEstimate: number;
};

const TARGET_TOKENS = 1_500;
const OVERLAP_TOKENS = 150;
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split on blank-line (paragraph / message) boundaries, then greedily pack
 * paragraphs into ~1,500-token chunks with ~150-token overlap. Char offsets
 * are preserved so citations can point back at exact substrings.
 */
export function chunkText(content: string): Chunk[] {
  const targetChars = TARGET_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN;

  // Paragraph boundaries with their absolute char positions.
  const paragraphs: Array<{ text: string; start: number }> = [];
  const regex = /\n\s*\n/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const end = match.index;
    if (end > cursor) {
      paragraphs.push({ text: content.slice(cursor, end), start: cursor });
    }
    cursor = regex.lastIndex;
  }
  if (cursor < content.length) {
    paragraphs.push({ text: content.slice(cursor), start: cursor });
  }
  if (paragraphs.length === 0) {
    paragraphs.push({ text: content, start: 0 });
  }

  const chunks: Chunk[] = [];
  let ordinal = 0;
  let bufStart = paragraphs[0].start;
  let bufEnd = bufStart;

  const flush = () => {
    if (bufEnd <= bufStart) return;
    const text = content.slice(bufStart, bufEnd);
    if (!text.trim()) return;
    chunks.push({
      ordinal: ordinal++,
      text,
      charStart: bufStart,
      charEnd: bufEnd,
      tokenEstimate: estimateTokens(text),
    });
  };

  for (const para of paragraphs) {
    const paraEnd = para.start + para.text.length;
    // A single oversized paragraph: hard-split it.
    if (para.text.length > targetChars) {
      flush();
      for (let i = para.start; i < paraEnd; i += targetChars) {
        const end = Math.min(i + targetChars, paraEnd);
        const text = content.slice(i, end);
        if (!text.trim()) continue;
        chunks.push({
          ordinal: ordinal++,
          text,
          charStart: i,
          charEnd: end,
          tokenEstimate: estimateTokens(text),
        });
      }
      bufStart = paraEnd;
      bufEnd = paraEnd;
      continue;
    }

    if (bufEnd - bufStart + (paraEnd - bufEnd) > targetChars && bufEnd > bufStart) {
      flush();
      // Start next buffer with a small overlap back into the prior text.
      bufStart = Math.max(bufStart, para.start - overlapChars);
    }
    if (bufEnd === bufStart) bufStart = para.start;
    bufEnd = paraEnd;
  }
  flush();

  return chunks;
}
