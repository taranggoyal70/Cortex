import { ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CategoryBadge,
  ConfidenceBar,
  StatusBadge,
} from "@/components/skill-badges";
import { SkillActions } from "@/components/skill-actions";
import { SkillView } from "@/components/skill-view";
import { requireWorkspace } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getSkillDetail } from "@/lib/skills";

export const metadata: Metadata = { title: "Skill" };

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const ctx = await requireWorkspace();
  const { skillId } = await params;
  let detail;
  try {
    detail = await getSkillDetail(ctx.workspaceId, skillId);
  } catch (error) {
    if (error instanceof AppError && error.code === "skill_not_found") notFound();
    throw error;
  }

  const { skill, displayVersion, citations, versions } = detail;
  if (!displayVersion) notFound();

  return (
    <main className="mx-auto max-w-[860px] px-6 py-10">
      <Link
        href={"/skills" as Route}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-light transition hover:text-paper"
      >
        <ArrowLeftIcon size={14} />
        All skills
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryBadge category={skill.category} />
            <StatusBadge status={skill.status} />
            <span className="font-mono text-[10px] text-muted">
              v{displayVersion.version}
            </span>
            {skill.isStale && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber">
                <WarningIcon size={12} weight="fill" />
                stale
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-paper">{skill.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">{skill.slug}</p>
        </div>
        {skill.confidence && <ConfidenceBar value={Number(skill.confidence)} />}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-6">
        <SkillView body={displayVersion.body} />
      </div>

      <div className="mt-6">
        <SkillActions
          skillId={skill.id}
          versionId={displayVersion.id}
          status={skill.status}
          body={displayVersion.body}
          isAdmin={ctx.isAdmin}
        />
      </div>

      {citations.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Provenance ({citations.length} citations)
          </h2>
          <ul className="space-y-2">
            {citations.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-line bg-surface px-4 py-3"
              >
                <p className="text-sm leading-6 text-muted-light">
                  &ldquo;{c.quote}&rdquo;
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {c.sourceTitle ?? "source"} · {c.claimPath}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {versions.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Version history
          </h2>
          <ul className="space-y-1 text-sm text-muted-light">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">v{v.version}</span>
                <span className="capitalize">{v.state}</span>
                <span className="text-muted">
                  {v.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
