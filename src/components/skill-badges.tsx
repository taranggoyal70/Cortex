import { cn } from "@/lib/utils";

const categoryColor: Record<string, string> = {
  support: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  sales: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  finance: "text-amber border-amber/30 bg-amber/10",
  engineering: "text-violet-light border-violet/30 bg-violet/10",
  hr: "text-pink-300 border-pink-400/30 bg-pink-400/10",
  legal: "text-indigo-300 border-indigo-400/30 bg-indigo-400/10",
  ops: "text-teal-300 border-teal-400/30 bg-teal-400/10",
  security: "text-rose-300 border-rose-400/30 bg-rose-400/10",
  other: "text-muted-light border-line-strong bg-white/5",
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        categoryColor[category] ?? categoryColor.other,
      )}
    >
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "text-mint border-mint/25 bg-mint/10",
    proposed: "text-amber border-amber/25 bg-amber/10",
    archived: "text-muted border-line-strong bg-white/5",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        map[status] ?? map.archived,
      )}
    >
      {status}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 75 ? "bg-mint" : pct >= 50 ? "bg-amber" : "bg-danger",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-muted">{pct}%</span>
    </div>
  );
}
