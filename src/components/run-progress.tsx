"use client";

import {
  CheckCircleIcon,
  CircleNotchIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Run = {
  id: string;
  status: "queued" | "running" | "partial" | "completed" | "failed";
  batchCount: number;
  batchesDone: number;
  proposedSkillCount: number;
  conflictCount: number;
  modelCallsUsed: number;
  error: string | null;
};

const ACTIVE = new Set(["queued", "running"]);

export function RunProgress({ initialRun }: { initialRun: Run }) {
  const [run, setRun] = useState(initialRun);
  const active = ACTIVE.has(run.status);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${run.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { run: Run };
      setRun(data.run);
    } catch {
      // keep last state
    }
  }, [run.id]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void load(), 2_500);
    return () => window.clearInterval(timer);
  }, [active, load]);

  const pct =
    run.batchCount > 0
      ? Math.round((run.batchesDone / run.batchCount) * 100)
      : active
        ? 5
        : 100;

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        {run.status === "completed" ? (
          <CheckCircleIcon size={22} weight="fill" className="text-mint" />
        ) : run.status === "failed" ? (
          <XCircleIcon size={22} weight="fill" className="text-danger" />
        ) : run.status === "partial" ? (
          <WarningCircleIcon size={22} weight="fill" className="text-amber" />
        ) : (
          <CircleNotchIcon size={22} className="animate-spin text-violet-light" />
        )}
        <div>
          <p className="font-semibold text-paper">
            {run.status === "completed" && "Extraction complete"}
            {run.status === "failed" && "Extraction failed"}
            {run.status === "partial" && "Extraction paused (budget reached)"}
            {(run.status === "running" || run.status === "queued") &&
              "Reading your sources…"}
          </p>
          <p className="text-sm text-muted">
            {run.batchCount > 0
              ? `Batch ${run.batchesDone} of ${run.batchCount}`
              : "Preparing batches"}
            {run.modelCallsUsed > 0 && ` · ${run.modelCallsUsed} model calls`}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet to-mint transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {(run.status === "completed" || run.status === "partial") && (
        <div className="mt-6 flex flex-wrap gap-6">
          <div>
            <div className="text-2xl font-semibold text-paper">
              {run.proposedSkillCount}
            </div>
            <div className="text-sm text-muted">skills proposed</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-paper">
              {run.conflictCount}
            </div>
            <div className="text-sm text-muted">conflicts flagged</div>
          </div>
        </div>
      )}

      {run.error && (
        <p className="mt-4 rounded-lg border border-amber/25 bg-amber/10 px-3 py-2 text-sm text-amber">
          {run.error}
        </p>
      )}

      {!active && run.status !== "failed" && (
        <Link
          href={"/review" as Route}
          className="mt-6 inline-flex rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink"
        >
          Review the skills →
        </Link>
      )}
    </div>
  );
}
