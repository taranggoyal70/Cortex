"use client";

import { WarningIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CategoryBadge,
  ConfidenceBar,
  StatusBadge,
} from "@/components/skill-badges";

export type SkillSummary = {
  id: string;
  name: string;
  slug: string;
  category: React.ComponentProps<typeof CategoryBadge>["category"];
  status: React.ComponentProps<typeof StatusBadge>["status"];
  confidence: string | number | null;
  isStale: boolean;
};

const selectClass =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper focus:border-accent focus:outline-none";

export function SkillsExplorer({ skills }: { skills: SkillSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [staleOnly, setStaleOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(skills.map((s) => s.category))).sort(),
    [skills],
  );
  const statuses = useMemo(
    () => Array.from(new Set(skills.map((s) => s.status))).sort(),
    [skills],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (status !== "all" && s.status !== status) return false;
      if (staleOnly && !s.isStale) return false;
      if (q && !(`${s.name} ${s.slug}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [skills, query, category, status, staleOnly]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills…"
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
            className="accent-accent"
          />
          Stale only
        </label>
        <span className="font-mono text-[11px] text-muted">
          {filtered.length} of {skills.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center text-sm text-muted">
          No skills match these filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <Link
              key={skill.id}
              href={`/skills/${skill.id}` as Route}
              className="group rounded-xl border border-line bg-surface p-5 transition hover:border-line-strong"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <CategoryBadge category={skill.category} />
                <StatusBadge status={skill.status} />
              </div>
              <h2 className="font-semibold leading-snug text-paper group-hover:text-accent-light">
                {skill.name}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted">{skill.slug}</p>
              <div className="mt-4 flex items-center justify-between">
                {skill.confidence ? (
                  <ConfidenceBar value={Number(skill.confidence)} />
                ) : (
                  <span />
                )}
                {skill.isStale && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber">
                    <WarningIcon size={12} weight="fill" />
                    stale
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
