"use client";

import { CopyIcon, DownloadSimpleIcon, TerminalIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const FORMATS = [
  { key: "md", label: "SKILL.md", hint: "Claude Agent-Skill format" },
  { key: "json", label: "JSON", hint: "Structured, for programmatic use" },
  { key: "yaml", label: "YAML", hint: "Human-readable config" },
] as const;

type Format = (typeof FORMATS)[number]["key"];

export function ExportPanel({ appUrl }: { appUrl: string }) {
  const [format, setFormat] = useState<Format>("md");
  const [loaded, setLoaded] = useState<{ format: Format; text: string } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/export?format=${format}`)
      .then((r) => r.text())
      .then((text) => {
        if (active) setLoaded({ format, text });
      })
      .catch(() => {
        if (active) setLoaded({ format, text: "" });
      });
    return () => {
      active = false;
    };
  }, [format]);

  const loading = loaded?.format !== format;
  const preview = loading ? "" : loaded.text;

  const curl = `curl -H "Authorization: Bearer <token>" \\
  ${appUrl}/api/agent/skills?format=${format}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormat(f.key)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                format === f.key
                  ? "border-accent bg-accent/10"
                  : "border-line hover:border-line-strong"
              }`}
            >
              <p className="text-sm font-semibold text-paper">{f.label}</p>
              <p className="text-xs text-muted">{f.hint}</p>
            </button>
          ))}
        </div>

        <a
          href={`/api/export?format=${format}&download=1`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink"
        >
          <DownloadSimpleIcon size={15} weight="bold" />
          Download {FORMATS.find((f) => f.key === format)?.label}
        </a>

        <div className="mt-6 rounded-lg border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-paper">
            <TerminalIcon size={14} weight="bold" />
            Pull from an agent
          </p>
          <p className="mt-1 text-xs text-muted">
            Create a token in Settings → API tokens, then:
          </p>
          <div className="mt-2 flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-ink p-2 font-mono text-[10px] leading-relaxed text-paper">
              {curl}
            </pre>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(curl);
                toast.success("Copied.");
              }}
              className="rounded-md border border-line-strong p-1.5 text-muted-light transition hover:text-paper"
              aria-label="Copy curl"
            >
              <CopyIcon size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Preview</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(preview);
              toast.success("Copied to clipboard.");
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-paper"
          >
            <CopyIcon size={13} />
            Copy
          </button>
        </div>
        <pre className="min-w-0 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-ink p-4 font-mono text-[11px] leading-relaxed text-paper">
          {loading ? "Loading…" : preview || "No approved skills to export yet."}
        </pre>
      </div>
    </div>
  );
}
