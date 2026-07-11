import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  citations,
  conflicts,
  extractionRuns,
  skills,
  skillVersions,
  sourceChunks,
  sources,
  workspaces,
} from "@/db/schema";
import {
  extractBatch,
  loadChunksForSources,
  mergeAndPersist,
  packBatches,
} from "@/lib/extractor";
import { createRun } from "@/lib/runs";
import { seedSampleCompany } from "@/lib/seed";
import { approveSkillVersion, getApprovedSkills } from "@/lib/skills";
import { runScenario } from "@/lib/playground";

const WS = "ws_demo_headless";
const USER = "user_demo_headless";

async function cleanup(db: ReturnType<typeof getDb>) {
  await db.delete(citations).where(eq(citations.workspaceId, WS));
  await db.delete(skillVersions).where(eq(skillVersions.workspaceId, WS));
  await db.delete(skills).where(eq(skills.workspaceId, WS));
  await db.delete(conflicts).where(eq(conflicts.workspaceId, WS));
  await db.delete(sourceChunks).where(eq(sourceChunks.workspaceId, WS));
  await db.delete(sources).where(eq(sources.workspaceId, WS));
  await db.delete(extractionRuns).where(eq(extractionRuns.workspaceId, WS));
  await db.delete(workspaces).where(eq(workspaces.id, WS));
}

async function main() {
  const db = getDb();
  console.log("→ cleaning any prior demo state");
  await cleanup(db);

  console.log("→ creating demo workspace");
  await db
    .insert(workspaces)
    .values({ id: WS, name: "Northwind (demo)", slug: "northwind-demo", sampleSeeded: false });

  console.log("→ seeding sample company");
  const seeded = await seedSampleCompany({ workspaceId: WS, createdBy: USER });
  console.log("   seeded sources:", seeded.created);

  const srcRows = await db
    .select({ id: sources.id, title: sources.title })
    .from(sources)
    .where(eq(sources.workspaceId, WS));
  const sourceIds = srcRows.map((s) => s.id);
  console.log("   sources:", srcRows.map((s) => s.title).join(" | "));

  console.log("→ loading + packing chunks");
  const chunks = await loadChunksForSources(WS, sourceIds);
  const chunkToSource = new Map(chunks.map((c) => [c.id, c.sourceId]));
  const batches = packBatches(chunks);
  console.log(`   ${chunks.length} chunks → ${batches.length} batch(es)`);

  const run = await createRun({
    workspaceId: WS,
    createdBy: USER,
    sourceIds,
    trigger: "demo",
  });

  console.log("→ extracting skills (GitHub Models)");
  const candidates = [];
  for (let i = 0; i < batches.length; i++) {
    const result = await extractBatch(batches[i]);
    if (result.ok) {
      candidates.push(...result.skills);
      console.log(`   batch ${i + 1}/${batches.length}: ${result.skills.length} verified skill(s)`);
    } else {
      console.log(`   batch ${i + 1}/${batches.length}: FAILED (${result.reason})`);
    }
  }

  console.log("→ merge + persist");
  const merged = await mergeAndPersist({
    workspaceId: WS,
    runId: run.id,
    createdBy: USER,
    candidates,
    chunkToSource,
  });
  console.log(`   proposed skills: ${merged.proposedSkillCount}, conflicts: ${merged.conflictCount}`);

  const skillRows = await db
    .select({ id: skills.id, name: skills.name, slug: skills.slug, confidence: skills.confidence })
    .from(skills)
    .where(eq(skills.workspaceId, WS));
  console.log("\n=== EXTRACTED SKILLS ===");
  for (const s of skillRows) {
    console.log(`• ${s.name} (${s.slug}) conf=${s.confidence}`);
  }

  const conflictRows = await db
    .select({ kind: conflicts.kind, summary: conflicts.summary })
    .from(conflicts)
    .where(eq(conflicts.workspaceId, WS));
  console.log("\n=== CONFLICTS (sources disagreeing) ===");
  for (const c of conflictRows) console.log(`• [${c.kind}] ${c.summary}`);

  // Approve the refund skill so the playground can use it.
  const refund = skillRows.find((s) => /refund/i.test(s.slug) || /refund/i.test(s.name));
  if (refund) {
    const [ver] = await db
      .select({ id: skillVersions.id })
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, refund.id), eq(skillVersions.workspaceId, WS)))
      .limit(1);
    await approveSkillVersion({ workspaceId: WS, userId: USER, skillId: refund.id, versionId: ver.id });
    console.log(`\n→ approved "${refund.name}" for playground`);
  }

  const approved = await getApprovedSkills(WS);
  if (approved.length > 0) {
    console.log("\n=== PLAYGROUND: 'refund after 45 days' ===");
    const outcome = await runScenario(
      WS,
      "A customer bought a plan 45 days ago and wants a full refund. What should I do?",
    );
    console.log("matched:", outcome.result.matched, "| skill:", outcome.result.chosenSkillSlug);
    console.log("handling:", outcome.result.handling);
    console.log("rules:", JSON.stringify(outcome.result.appliedRules));
    console.log("citations:", JSON.stringify(outcome.result.citations, null, 2));
    console.log("deferToHuman:", outcome.result.deferToHuman);
  } else {
    console.log("\n(no approved skill to run playground)");
  }

  console.log("\n→ cleaning up demo workspace");
  await cleanup(db);
  console.log("✓ done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEMO FAILED:", err);
    process.exit(1);
  });
