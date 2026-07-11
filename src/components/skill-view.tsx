import type { SkillBody } from "@/lib/domain/skill";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CiteChips({
  citations,
}: {
  citations: { chunkId: string; quote: string }[];
}) {
  if (citations.length === 0) return null;
  return (
    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
      {citations.map((c, i) => (
        <span
          key={`${c.chunkId}-${i}`}
          title={c.quote}
          className="inline-flex cursor-help items-center rounded border border-accent/30 bg-accent/10 px-1.5 py-px font-mono text-[9px] text-accent-light"
        >
          cite
        </span>
      ))}
    </span>
  );
}

export function SkillView({ body }: { body: SkillBody }) {
  return (
    <div>
      <p className="text-sm leading-6 text-muted-light">{body.whenToUse}</p>

      {body.triggers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {body.triggers.map((t) => (
            <span
              key={t}
              className="rounded-md border border-line bg-white/5 px-2 py-0.5 text-xs text-muted-light"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <Section title="Steps">
        <ol className="space-y-2">
          {body.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-6 text-paper">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line-strong text-[10px] text-muted">
                {step.order}
              </span>
              <span>
                {step.instruction}
                <CiteChips citations={step.citations} />
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {body.decisionRules.length > 0 && (
        <Section title="Decision rules">
          <ul className="space-y-2">
            {body.decisionRules.map((rule, i) => (
              <li key={i} className="text-sm leading-6 text-paper">
                <span className="text-muted-light">If</span> {rule.condition}{" "}
                <span className="text-muted-light">→</span> {rule.action}
                <CiteChips citations={rule.citations} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {body.exceptions.length > 0 && (
        <Section title="Exceptions">
          <ul className="space-y-2">
            {body.exceptions.map((ex, i) => (
              <li key={i} className="text-sm leading-6 text-paper">
                <span className="font-medium">{ex.situation}:</span>{" "}
                {ex.handling}
                <CiteChips citations={ex.citations} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {body.guardrails.length > 0 && (
        <Section title="Guardrails">
          <ul className="space-y-2">
            {body.guardrails.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm leading-6">
                <span
                  className={
                    g.severity === "must"
                      ? "font-mono text-[10px] font-bold uppercase text-danger"
                      : "font-mono text-[10px] font-bold uppercase text-amber"
                  }
                >
                  {g.severity}
                </span>
                <span className="text-paper">
                  {g.rule}
                  <CiteChips citations={g.citations} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {body.owners.length > 0 && (
        <Section title="Owners">
          <p className="text-sm text-muted-light">{body.owners.join(", ")}</p>
        </Section>
      )}

      {body.extractorNotes && (
        <Section title="Extractor notes">
          <p className="text-sm italic leading-6 text-muted">
            {body.extractorNotes}
          </p>
        </Section>
      )}
    </div>
  );
}
