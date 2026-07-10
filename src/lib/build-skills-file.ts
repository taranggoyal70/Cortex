import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import {
  type ApprovedSkill,
  toSkillJson,
  toSkillMarkdown,
  toSkillYaml,
} from "@/lib/export";
import { getApprovedSkills } from "@/lib/skills";

export type ExportFormat = "md" | "json" | "yaml";

export async function buildSkillsFile(
  workspaceId: string,
  format: ExportFormat,
): Promise<{ body: string; contentType: string; filename: string }> {
  const db = getDb();
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const name = ws?.name ?? "Company";

  const rows = await getApprovedSkills(workspaceId);
  const skills: ApprovedSkill[] = rows.map((r) => ({
    slug: r.slug,
    version: r.version,
    body: r.body,
    citations: r.citations,
  }));

  if (format === "json") {
    return {
      body: JSON.stringify(toSkillJson(name, skills), null, 2),
      contentType: "application/json; charset=utf-8",
      filename: "cortex-skills.json",
    };
  }
  if (format === "yaml") {
    return {
      body: toSkillYaml(name, skills),
      contentType: "application/x-yaml; charset=utf-8",
      filename: "cortex-skills.yaml",
    };
  }
  return {
    body: toSkillMarkdown(name, skills),
    contentType: "text/markdown; charset=utf-8",
    filename: "cortex-skills.md",
  };
}

export function parseFormat(value: string | null): ExportFormat {
  return value === "json" || value === "yaml" ? value : "md";
}
