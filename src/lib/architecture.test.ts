import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(absolute);
      return /\.(ts|tsx)$/.test(entry.name) &&
        !/\.test\.(ts|tsx)$/.test(entry.name)
        ? [absolute]
        : [];
    }),
  );
  return nested.flat();
}

describe("production architecture constraints", () => {
  it("never treats browser storage as product state", async () => {
    const files = await sourceFiles(path.resolve("src"));
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(source)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps workflow delays durable", async () => {
    const files = await sourceFiles(path.resolve("src/workflows"));
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (/\bset(Timeout|Interval)\s*\(/.test(source)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toEqual([]);
  });
});
