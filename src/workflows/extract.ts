import type { ExtractionConflict, SkillBody } from "@/lib/domain/skill";
import {
  extractBatch,
  loadChunksForSources,
  markSourcesExtracted,
  mergeAndPersist,
  packBatches,
  type Batch,
} from "@/lib/extractor";
import { updateRun } from "@/lib/runs";

type WorkflowInput = {
  workspaceId: string;
  runId: string;
  sourceIds: string[];
};

async function prepareBatchesStep(input: WorkflowInput) {
  "use step";

  await updateRun(input.runId, { status: "running", startedAt: new Date() });
  const chunks = await loadChunksForSources(input.workspaceId, input.sourceIds);
  const batches = packBatches(chunks);
  await updateRun(input.runId, { batchCount: batches.length });
  const chunkToSource = chunks.map((c) => [c.id, c.sourceId] as const);
  return { batches, chunkToSource };
}

async function extractBatchStep(input: {
  batch: Batch;
  runId: string;
  index: number;
}) {
  "use step";

  const result = await extractBatch(input.batch);
  await updateRun(input.runId, { batchesDone: input.index + 1 });
  if (!result.ok) {
    return {
      skills: [] as SkillBody[],
      conflicts: [] as ExtractionConflict[],
      stopped: result.reason,
    };
  }
  return {
    skills: result.skills,
    conflicts: result.conflicts,
    stopped: null as string | null,
  };
}

async function persistStep(input: {
  workspaceId: string;
  runId: string;
  sourceIds: string[];
  candidates: SkillBody[];
  modelConflicts: ExtractionConflict[];
  chunkToSource: (readonly [string, string])[];
  partial: boolean;
  callsUsed: number;
}) {
  "use step";

  const chunkToSource = new Map(input.chunkToSource);
  const { proposedSkillCount, conflictCount } = await mergeAndPersist({
    workspaceId: input.workspaceId,
    runId: input.runId,
    candidates: input.candidates,
    chunkToSource,
    modelConflicts: input.modelConflicts,
  });

  await markSourcesExtracted(input.workspaceId, input.sourceIds);
  await updateRun(input.runId, {
    status: input.partial ? "partial" : "completed",
    candidateCount: input.candidates.length,
    proposedSkillCount,
    conflictCount,
    modelCallsUsed: input.callsUsed,
    completedAt: new Date(),
    error: input.partial
      ? "Daily model budget reached before all sources were processed. Re-run tomorrow to finish."
      : null,
  });
  return { proposedSkillCount, conflictCount };
}

async function failStep(runId: string, message: string) {
  "use step";
  await updateRun(runId, {
    status: "failed",
    error: message.slice(0, 1_000),
    completedAt: new Date(),
  });
}

export async function extractWorkflow(input: WorkflowInput) {
  "use workflow";

  try {
    const { batches, chunkToSource } = await prepareBatchesStep(input);
    if (batches.length === 0) {
      await persistStep({
        ...input,
        candidates: [],
        modelConflicts: [],
        chunkToSource,
        partial: false,
        callsUsed: 0,
      });
      return { proposedSkillCount: 0 };
    }

    const candidates: SkillBody[] = [];
    const modelConflicts: ExtractionConflict[] = [];
    let partial = false;
    let callsUsed = 0;
    for (let i = 0; i < batches.length; i += 1) {
      const result = await extractBatchStep({
        batch: batches[i],
        runId: input.runId,
        index: i,
      });
      candidates.push(...result.skills);
      modelConflicts.push(...result.conflicts);
      if (result.stopped === "budget" || result.stopped === "rate_limit") {
        partial = true;
        break;
      }
      callsUsed += 1;
    }

    return await persistStep({
      ...input,
      candidates,
      modelConflicts,
      chunkToSource,
      partial,
      callsUsed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown extraction error";
    await failStep(input.runId, message);
    throw error;
  }
}
