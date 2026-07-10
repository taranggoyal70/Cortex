"use client";

import {
  FileArrowUpIcon,
  SparkleIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Source = {
  id: string;
  type: string;
  title: string;
  bytes: number;
  origin: { channel?: string; filename?: string; author?: string };
  createdAt: string;
};

export function SourceManager({
  sources,
  isAdmin,
}: {
  sources: Source[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function ingest(payload: { title: string; content: string; type: "paste" | "upload" }) {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      deduped?: boolean;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message ?? "Could not add source.");
    return data;
  }

  async function submitPaste(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setPending(true);
    try {
      const data = await ingest({ title, content, type: "paste" });
      toast.success(data.deduped ? "Already ingested (identical content)." : "Source added.");
      setTitle("");
      setContent("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add source.");
    } finally {
      setPending(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPending(true);
    try {
      let added = 0;
      for (const file of Array.from(files)) {
        const text = await file.text();
        if (!text.trim()) continue;
        await ingest({ title: file.name, content: text, type: "upload" });
        added += 1;
      }
      toast.success(`Uploaded ${added} file${added === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function seed() {
    setPending(true);
    try {
      const res = await fetch("/api/sources/seed", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        alreadySeeded?: boolean;
        created?: number;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(data.error?.message ?? "Could not seed.");
      toast.success(
        data.alreadySeeded
          ? "Sample company already loaded."
          : `Loaded ${data.created} sample sources.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not seed.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this source?")) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(data.error?.message ?? "Could not delete.");
      }
      toast.success("Source deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-paper">
            Sources <span className="text-muted">({sources.length})</span>
          </h2>
        </div>
        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
            No sources yet. Paste text, upload files, or load the sample company.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {sources.map((source) => (
              <li key={source.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-paper">
                    {source.title}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                    {source.type}
                    {source.origin.channel ? ` · ${source.origin.channel}` : ""}
                    {source.origin.author ? ` · ${source.origin.author}` : ""} ·{" "}
                    {(source.bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => remove(source.id)}
                    className="rounded-md p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete source"
                  >
                    <TrashIcon size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <button
            type="button"
            onClick={seed}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet/40 bg-violet/10 px-4 py-2.5 text-sm font-medium text-violet-light transition hover:bg-violet/20 disabled:opacity-50"
          >
            <SparkleIcon size={16} weight="fill" />
            Load sample company
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            A realistic B2B SaaS with scattered, slightly-contradictory knowledge.
          </p>
        </div>

        <form onSubmit={submitPaste} className="rounded-xl border border-line bg-surface p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Paste a source
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Refund policy)"
            className="mb-2 w-full rounded-lg border border-line-strong bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste a doc, Slack thread, ticket, or transcript…"
            rows={6}
            className="mb-3 w-full resize-y rounded-lg border border-line-strong bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
          />
          <button
            type="submit"
            disabled={pending || !title.trim() || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink disabled:opacity-50"
          >
            <UploadSimpleIcon size={15} weight="bold" />
            Add source
          </button>
        </form>

        <div className="rounded-xl border border-line bg-surface p-4">
          <input
            ref={fileInput}
            type="file"
            accept=".md,.txt,.csv,text/plain,text/markdown,text/csv"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-sm text-muted-light transition hover:bg-white/5 hover:text-paper disabled:opacity-50"
          >
            <FileArrowUpIcon size={16} />
            Upload .md / .txt / .csv
          </button>
        </div>
      </div>
    </div>
  );
}
