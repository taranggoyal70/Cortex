"use client";

import { CheckCircleIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { SkillBody } from "@/lib/domain/skill";

export function SkillActions({
  skillId,
  versionId,
  status,
  body,
  isAdmin,
}: {
  skillId: string;
  versionId: string;
  status: string;
  body: SkillBody;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(body, null, 2));

  if (!isAdmin) {
    return (
      <p className="text-xs text-muted">
        Workspace admins can approve and edit skills.
      </p>
    );
  }

  async function approve() {
    setPending(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) throw new Error("Approve failed.");
      toast.success("Skill approved. It's now in your skills file.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed.");
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    if (!window.confirm("Archive this skill? It will leave the skills file.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Archive failed.");
      toast.success("Skill archived.");
      router.push("/skills");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed.");
      setPending(false);
    }
  }

  async function saveEdit() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      toast.error("Invalid JSON.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: parsed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(data.error?.message ?? "Save failed.");
      toast.success("Saved as a new approved version.");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
          className="w-full resize-y rounded-lg border border-line-strong bg-ink px-3 py-2 font-mono text-xs text-paper focus:outline-none focus:ring-1 focus:ring-violet"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveEdit}
            disabled={pending}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink disabled:opacity-50"
          >
            Save version
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-line-strong px-4 py-2 text-sm text-muted-light transition hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" && (
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink disabled:opacity-50"
        >
          <CheckCircleIcon size={15} weight="fill" />
          Approve
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2 text-sm text-muted-light transition hover:bg-white/5 hover:text-paper"
      >
        <PencilSimpleIcon size={15} />
        Edit
      </button>
      <button
        type="button"
        onClick={archive}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-danger/25 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        <TrashIcon size={15} />
        Archive
      </button>
    </div>
  );
}
