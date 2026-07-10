"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Conflict = {
  id: string;
  kind: string;
  summary: string;
  sideA: { detail?: string; quote?: string } | null;
  sideB: { detail?: string; quote?: string } | null;
};

export function ConflictResolver({
  conflict,
  isAdmin,
}: {
  conflict: Conflict;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(resolution: "resolved" | "dismissed") {
    setPending(true);
    try {
      const res = await fetch(`/api/conflicts/${conflict.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      if (!res.ok) throw new Error("Could not update conflict.");
      toast.success(resolution === "resolved" ? "Marked resolved." : "Dismissed.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber/25 bg-amber/[0.06] p-5">
      <div className="flex items-center gap-2">
        <span className="rounded border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-amber">
          {conflict.kind}
        </span>
        <p className="text-sm font-medium text-paper">{conflict.summary}</p>
      </div>
      {(conflict.sideA?.detail || conflict.sideB?.detail) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-ink/50 p-3 text-xs text-muted-light">
            {conflict.sideA?.detail ?? conflict.sideA?.quote}
          </div>
          <div className="rounded-lg border border-line bg-ink/50 p-3 text-xs text-muted-light">
            {conflict.sideB?.detail ?? conflict.sideB?.quote}
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => act("resolved")}
            className="rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-light hover:text-ink disabled:opacity-50"
          >
            Mark resolved
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => act("dismissed")}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-xs text-muted-light transition hover:bg-white/5 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
