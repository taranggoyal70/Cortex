function messageFromUnknown(
  value: unknown,
  seen: Set<object>,
  depth: number,
): string | undefined {
  if (depth > 4 || value === null || typeof value !== "object") {
    return undefined;
  }

  if (seen.has(value)) return undefined;
  seen.add(value);
  const record = value as Record<string, unknown>;

  if (typeof record.message === "string") {
    const message = record.message.trim();
    if (message) return message;
  }

  for (const key of ["cause", "error", "originalError"] as const) {
    if (key in record) {
      const nested = messageFromUnknown(record[key], seen, depth + 1);
      if (nested) return nested;
    }
  }

  return undefined;
}

export function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error.trim();
  return messageFromUnknown(error, new Set(), 0) ?? fallback;
}
