"use client";

import { CircleNotchIcon, LightningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ExtractButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/extract", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        runId?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.runId) {
        throw new Error(data.error?.message ?? "Could not start extraction.");
      }
      toast.success("Extraction started.");
      router.push(`/runs/${data.runId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start extraction.",
      );
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink disabled:opacity-50"
    >
      {pending ? (
        <CircleNotchIcon size={15} className="animate-spin" />
      ) : (
        <LightningIcon size={15} weight="fill" />
      )}
      Run extraction
    </button>
  );
}
