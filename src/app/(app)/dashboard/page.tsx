import {
  ArrowRightIcon,
  FilesIcon,
  SquaresFourIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Route } from "next";
import Link from "next/link";

import { CreateWorkspacePrompt } from "@/components/create-workspace-prompt";
import { AppError } from "@/lib/errors";
import { requireWorkspace } from "@/lib/auth";
import { getWorkspaceOverview } from "@/lib/workspace-data";

export default async function DashboardPage() {
  let ctx;
  try {
    ctx = await requireWorkspace();
  } catch (error) {
    if (error instanceof AppError && error.code === "workspace_required") {
      return <CreateWorkspacePrompt />;
    }
    throw error;
  }

  const overview = await getWorkspaceOverview(ctx.workspaceId);

  const stats = [
    { label: "Sources ingested", value: overview.sources, href: "/sources" },
    { label: "Approved skills", value: overview.approvedSkills, href: "/skills" },
    { label: "Awaiting review", value: overview.proposedSkills, href: "/review" },
    { label: "Open conflicts", value: overview.openConflicts, href: "/review" },
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-paper">
            {overview.workspace?.name ?? "Company brain"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {overview.totalSkills === 0
              ? "No skills yet. Add sources and run extraction to build the brain."
              : `${overview.totalSkills} skill${overview.totalSkills === 1 ? "" : "s"} mapped · ${overview.staleSkills} flagged stale`}
          </p>
        </div>
        <Link
          href={"/sources" as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink"
        >
          Add sources
          <ArrowRightIcon size={15} weight="bold" />
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href as Route}
            className="rounded-xl border border-line bg-surface p-5 transition hover:border-line-strong"
          >
            <div className="text-3xl font-semibold text-paper">{stat.value}</div>
            <div className="mt-1 text-sm text-muted">{stat.label}</div>
          </Link>
        ))}
      </section>

      {overview.totalSkills === 0 && (
        <section className="mt-8 rounded-xl border border-line bg-surface p-8">
          <h2 className="text-lg font-semibold text-paper">Get started</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-light">
            <li className="flex gap-3">
              <FilesIcon size={18} className="mt-0.5 shrink-0 text-violet-light" />
              Add sources — paste text, upload files, or load the sample company.
            </li>
            <li className="flex gap-3">
              <SquaresFourIcon size={18} className="mt-0.5 shrink-0 text-violet-light" />
              Run extraction to turn them into cited, reviewable skills.
            </li>
            <li className="flex gap-3">
              <WarningCircleIcon size={18} className="mt-0.5 shrink-0 text-violet-light" />
              Approve skills, then export the file your agents can run.
            </li>
          </ol>
        </section>
      )}
    </main>
  );
}
