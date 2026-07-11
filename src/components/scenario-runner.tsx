"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  QuotesIcon,
  SealCheckIcon,
  ShieldWarningIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

type ScenarioResult = {
  matched: boolean;
  chosenSkillSlug: string | null;
  handling: string;
  appliedSteps: string[];
  appliedRules: string[];
  citations: { skillSlug: string; quote: string }[];
  guardrailsRespected: string[];
  deferToHuman: boolean;
  deferReason: string | null;
};

const EXAMPLES = [
  "A customer wants a refund on a plan they bought 45 days ago. What do I do?",
  "Production API is returning 500s for all customers. What's the on-call procedure?",
  "A prospect is asking for a 30% discount to close this quarter.",
];

export function ScenarioRunner({ examples }: { examples?: string[] }) {
  const [scenario, setScenario] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [consideredCount, setConsideredCount] = useState(0);

  const prompts = examples?.length ? examples : EXAMPLES;

  async function run(text: string) {
    const value = text.trim();
    if (value.length < 4) return;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        result?: ScenarioResult;
        skillsConsidered?: number;
        error?: { message?: string };
      };
      if (!res.ok || !data.result) {
        throw new Error(data.error?.message ?? "Could not run the scenario.");
      }
      setResult(data.result);
      setConsideredCount(data.skillsConsidered ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(scenario);
        }}
      >
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
          placeholder="Describe a real situation your team faces…"
          className="w-full resize-none rounded-xl border border-line-strong bg-ink px-4 py-3 text-sm text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setScenario(p);
                  void run(p);
                }}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-line-strong hover:text-paper"
              >
                {p.length > 42 ? `${p.slice(0, 42)}…` : p}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={pending || scenario.trim().length < 4}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink disabled:opacity-50"
          >
            {pending ? "Running…" : "Run it"}
            {!pending && <ArrowRightIcon size={15} weight="bold" />}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            {result.deferToHuman ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber">
                <UserIcon size={13} weight="fill" />
                Defers to a human
              </span>
            ) : result.matched ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                <SealCheckIcon size={13} weight="fill" />
                Matched skill
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber">
                No matching skill
              </span>
            )}
            {result.chosenSkillSlug && (
              <code className="font-mono text-xs text-accent-light">
                {result.chosenSkillSlug}
              </code>
            )}
            <span className="ml-auto text-[11px] text-muted">
              {consideredCount} skill{consideredCount === 1 ? "" : "s"} considered
            </span>
          </div>

          <p className="text-sm leading-relaxed text-paper">{result.handling}</p>

          {result.deferReason && (
            <p className="rounded-lg bg-amber/10 px-3 py-2 text-xs text-amber">
              {result.deferReason}
            </p>
          )}

          {result.appliedSteps.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Steps applied
              </p>
              <ol className="space-y-1">
                {result.appliedSteps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-paper">
                    <span className="text-muted">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.appliedRules.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Decision rules
              </p>
              <ul className="space-y-1">
                {result.appliedRules.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-paper">
                    <CheckCircleIcon
                      size={15}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-success"
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.guardrailsRespected.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <ShieldWarningIcon size={13} />
                Guardrails respected
              </p>
              <ul className="space-y-1">
                {result.guardrailsRespected.map((g, i) => (
                  <li key={i} className="text-sm text-muted-light">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.citations.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <QuotesIcon size={13} weight="fill" />
                Cited from your sources
              </p>
              <ul className="space-y-2">
                {result.citations.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-lg border-l-2 border-accent/50 bg-ink px-3 py-2"
                  >
                    <p className="text-sm italic text-paper">“{c.quote}”</p>
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      {c.skillSlug}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
