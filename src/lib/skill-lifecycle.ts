import type { SkillBody } from "@/lib/domain/skill";
import { AppError } from "@/lib/errors";

type SkillIdentity = { id: string; slug: string };
type SkillVersion = { id: string; body: SkillBody };
type SourceChunk = { id: string; sourceId: string; text: string };

export type VerifiedCitation = {
  claimPath: string;
  chunkId: string;
  sourceId: string;
  quote: string;
};

export type SkillLifecycleStore = {
  findSkill(
    workspaceId: string,
    skillId: string,
  ): Promise<SkillIdentity | null>;
  findSkillBySlug(
    workspaceId: string,
    slug: string,
  ): Promise<SkillIdentity | null>;
  findVersion(
    workspaceId: string,
    skillId: string,
    versionId: string,
  ): Promise<SkillVersion | null>;
  findSourceChunks(
    workspaceId: string,
    chunkIds: string[],
  ): Promise<SourceChunk[]>;
  commitEdit(input: {
    workspaceId: string;
    userId: string;
    skillId: string;
    skillSlug: string;
    body: SkillBody;
    citations: VerifiedCitation[];
  }): Promise<{ versionId: string }>;
  commitProposal(input: {
    workspaceId: string;
    runId: string;
    existingSkillId: string | null;
    body: SkillBody;
    citations: VerifiedCitation[];
  }): Promise<{ skillId: string; versionId: string }>;
  commitApproval(input: {
    workspaceId: string;
    userId: string;
    skillId: string;
    skillSlug: string;
    versionId: string;
    citations: VerifiedCitation[];
  }): Promise<void>;
  commitArchive(input: {
    workspaceId: string;
    userId: string;
    skillId: string;
    skillSlug: string;
  }): Promise<void>;
};

function citationClaims(body: SkillBody) {
  return [
    {
      path: "/whenToUse",
      citations: body.whenToUseCitations,
    },
    ...body.triggers.map((trigger, index) => ({
      path: `/triggers/${index}`,
      citations: trigger.citations,
    })),
    ...body.owners.map((owner, index) => ({
      path: `/owners/${index}`,
      citations: owner.citations,
    })),
    ...body.steps.map((claim, index) => ({
      path: `/steps/${index}`,
      citations: claim.citations,
    })),
    ...body.decisionRules.map((claim, index) => ({
      path: `/decisionRules/${index}`,
      citations: claim.citations,
    })),
    ...body.exceptions.map((claim, index) => ({
      path: `/exceptions/${index}`,
      citations: claim.citations,
    })),
    ...body.guardrails.map((claim, index) => ({
      path: `/guardrails/${index}`,
      citations: claim.citations,
    })),
  ];
}

function normalizeForCitationMatch(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function verifyCitations(
  store: SkillLifecycleStore,
  workspaceId: string,
  body: SkillBody,
): Promise<VerifiedCitation[]> {
  const claims = citationClaims(body);
  if (claims.some((claim) => claim.citations.length === 0)) {
    throw new AppError(
      "Every Skill claim must include a Citation.",
      400,
      "uncited_skill_claim",
    );
  }

  const requested = claims.flatMap((claim) =>
    claim.citations.map((citation) => ({
      claimPath: claim.path,
      ...citation,
    })),
  );
  const chunkIds = [...new Set(requested.map((citation) => citation.chunkId))];
  const chunks = await store.findSourceChunks(workspaceId, chunkIds);
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  return requested.map((citation) => {
    const chunk = byId.get(citation.chunkId);
    if (
      !chunk ||
      !normalizeForCitationMatch(chunk.text).includes(
        normalizeForCitationMatch(citation.quote),
      )
    ) {
      throw new AppError(
        "A Skill Citation is not a verbatim quote from a Workspace Source Chunk.",
        400,
        "invalid_skill_citation",
      );
    }
    return { ...citation, sourceId: chunk.sourceId };
  });
}

export function createSkillLifecycle(store: SkillLifecycleStore) {
  return {
    async propose(input: {
      workspaceId: string;
      runId: string;
      body: SkillBody;
    }) {
      const [existing, citations] = await Promise.all([
        store.findSkillBySlug(input.workspaceId, input.body.slug),
        verifyCitations(store, input.workspaceId, input.body),
      ]);
      const result = await store.commitProposal({
        ...input,
        existingSkillId: existing?.id ?? null,
        citations,
      });
      return { ...result, citationCount: citations.length };
    },

    async archive(input: {
      workspaceId: string;
      userId: string;
      skillId: string;
    }) {
      const skill = await store.findSkill(input.workspaceId, input.skillId);
      if (!skill) {
        throw new AppError("Skill not found.", 404, "skill_not_found");
      }
      await store.commitArchive({ ...input, skillSlug: skill.slug });
    },

    async approve(input: {
      workspaceId: string;
      userId: string;
      skillId: string;
      versionId: string;
    }) {
      const [skill, version] = await Promise.all([
        store.findSkill(input.workspaceId, input.skillId),
        store.findVersion(input.workspaceId, input.skillId, input.versionId),
      ]);
      if (!skill) {
        throw new AppError("Skill not found.", 404, "skill_not_found");
      }
      if (!version) {
        throw new AppError("Version not found.", 404, "version_not_found");
      }
      const citations = await verifyCitations(
        store,
        input.workspaceId,
        version.body,
      );
      await store.commitApproval({
        ...input,
        skillSlug: skill.slug,
        citations,
      });
      return { citationCount: citations.length };
    },

    async edit(input: {
      workspaceId: string;
      userId: string;
      skillId: string;
      body: SkillBody;
    }) {
      const skill = await store.findSkill(input.workspaceId, input.skillId);
      if (!skill) {
        throw new AppError("Skill not found.", 404, "skill_not_found");
      }
      if (input.body.slug !== skill.slug) {
        throw new AppError(
          "A Skill slug cannot change after the Skill is created.",
          400,
          "skill_slug_immutable",
        );
      }
      const citations = await verifyCitations(
        store,
        input.workspaceId,
        input.body,
      );
      const result = await store.commitEdit({
        ...input,
        skillSlug: skill.slug,
        citations,
      });
      return { ...result, citationCount: citations.length };
    },
  };
}
