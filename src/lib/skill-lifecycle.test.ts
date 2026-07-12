import { describe, expect, it } from "vitest";

import type { SkillBody } from "@/lib/domain/skill";
import { createSkillLifecycle } from "@/lib/skill-lifecycle";

const citedBody: SkillBody = {
  name: "Handle refund requests",
  slug: "handle-refunds",
  category: "support",
  whenToUse: "When a customer asks for a refund.",
  whenToUseCitations: [
    {
      chunkId: "chunk-1",
      quote: "When a customer asks for a refund.",
    },
  ],
  triggers: [
    {
      phrase: "customer requests a refund",
      citations: [{ chunkId: "chunk-1", quote: "customer requests a refund" }],
    },
  ],
  steps: [
    {
      order: 1,
      instruction: "Confirm the purchase date.",
      citations: [{ chunkId: "chunk-1", quote: "Confirm the purchase date." }],
    },
  ],
  decisionRules: [],
  exceptions: [],
  guardrails: [],
  owners: [
    {
      name: "Support",
      citations: [
        { chunkId: "chunk-1", quote: "Support owns refund requests." },
      ],
    },
  ],
  confidence: 0.9,
  extractorNotes: null,
};

function store() {
  return {
    findSkill: async () => ({ id: "skill-1", slug: "handle-refunds" }),
    findSkillBySlug: async () => null,
    findVersion: async () => ({ id: "version-1", body: citedBody }),
    findSourceChunks: async () => [
      {
        id: "chunk-1",
        sourceId: "source-1",
        text: "When a customer asks for a refund. A customer requests a refund. Support owns refund requests. Confirm the purchase date. Then check the refund window.",
      },
    ],
    commitEdit: async () => ({ versionId: "version-2" }),
    commitProposal: async () => ({
      skillId: "skill-1",
      versionId: "version-1",
    }),
    commitApproval: async () => undefined,
    commitArchive: async () => undefined,
  };
}

describe("Skill lifecycle", () => {
  it("creates an approved edit from verified Workspace Citations", async () => {
    const lifecycle = createSkillLifecycle(store());

    await expect(
      lifecycle.edit({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        body: citedBody,
      }),
    ).resolves.toEqual({ versionId: "version-2", citationCount: 4 });
  });

  it("rejects an edit when a claim has no Citation", async () => {
    const lifecycle = createSkillLifecycle(store());
    const body: SkillBody = {
      ...citedBody,
      steps: [{ ...citedBody.steps[0], citations: [] }],
    };

    await expect(
      lifecycle.edit({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        body,
      }),
    ).rejects.toMatchObject({ code: "uncited_skill_claim" });
  });

  it("rejects an edit when whenToUse has no Citation", async () => {
    const lifecycle = createSkillLifecycle(store());

    await expect(
      lifecycle.edit({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        body: { ...citedBody, whenToUseCitations: [] },
      }),
    ).rejects.toMatchObject({ code: "uncited_skill_claim" });
  });

  it("rejects an edit when an owner has no Citation", async () => {
    const lifecycle = createSkillLifecycle(store());

    await expect(
      lifecycle.edit({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        body: {
          ...citedBody,
          owners: [{ name: "Support", citations: [] }],
        },
      }),
    ).rejects.toMatchObject({ code: "uncited_skill_claim" });
  });

  it("keeps the Skill slug stable across human edits", async () => {
    const lifecycle = createSkillLifecycle(store());

    await expect(
      lifecycle.edit({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        body: { ...citedBody, slug: "renamed-refund-skill" },
      }),
    ).rejects.toMatchObject({ code: "skill_slug_immutable" });
  });

  it("re-verifies Citations before approving a Candidate Skill", async () => {
    const invalidBody: SkillBody = {
      ...citedBody,
      steps: [
        {
          ...citedBody.steps[0],
          citations: [{ chunkId: "chunk-1", quote: "A fabricated quote." }],
        },
      ],
    };
    const lifecycle = createSkillLifecycle({
      ...store(),
      findVersion: async () => ({ id: "version-1", body: invalidBody }),
    });

    await expect(
      lifecycle.approve({
        workspaceId: "workspace-1",
        userId: "user-1",
        skillId: "skill-1",
        versionId: "version-1",
      }),
    ).rejects.toMatchObject({ code: "invalid_skill_citation" });
  });

  it("does not archive a Skill outside the Workspace", async () => {
    const lifecycle = createSkillLifecycle({
      ...store(),
      findSkill: async () => null,
    });

    await expect(
      lifecycle.archive({
        workspaceId: "workspace-2",
        userId: "user-1",
        skillId: "skill-1",
      }),
    ).rejects.toMatchObject({ code: "skill_not_found" });
  });

  it("proposes a Candidate Skill with verified Citations", async () => {
    const lifecycle = createSkillLifecycle(store());

    await expect(
      lifecycle.propose({
        workspaceId: "workspace-1",
        runId: "run-1",
        body: citedBody,
      }),
    ).resolves.toEqual({
      skillId: "skill-1",
      versionId: "version-1",
      citationCount: 4,
    });
  });
});
