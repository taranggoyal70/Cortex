"use client";

import { CopyIcon, KeyIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Token = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function TokenManager({
  tokens,
  isAdmin,
}: {
  tokens: Token[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.token) {
        throw new Error(data.error?.message ?? "Could not create token.");
      }
      setFreshToken(data.token);
      setName("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create token.");
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this token? Agents using it will lose access.")) return;
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Revoke failed.");
      toast.success("Token revoked.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revoke failed.");
    }
  }

  return (
    <div>
      {isAdmin && (
        <form onSubmit={create} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token name (e.g. Production agent)"
            className="flex-1 rounded-lg border border-line-strong bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet"
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-light hover:text-ink disabled:opacity-50"
          >
            <KeyIcon size={15} weight="fill" />
            Create token
          </button>
        </form>
      )}

      {freshToken && (
        <div className="mb-6 rounded-lg border border-mint/30 bg-mint/10 p-4">
          <p className="text-xs font-semibold text-mint">
            Copy this token now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-ink px-3 py-2 font-mono text-xs text-paper">
              {freshToken}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(freshToken);
                toast.success("Copied.");
              }}
              className="rounded-lg border border-line-strong p-2 text-muted-light transition hover:bg-white/5 hover:text-paper"
            >
              <CopyIcon size={15} />
            </button>
          </div>
        </div>
      )}

      {tokens.length === 0 ? (
        <p className="text-sm text-muted">No API tokens yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-paper">
                  {token.name}
                  {token.revokedAt && (
                    <span className="ml-2 text-xs text-danger">revoked</span>
                  )}
                </p>
                <p className="font-mono text-[10px] text-muted">
                  {token.prefix}…{" "}
                  {token.lastUsedAt
                    ? `· last used ${new Date(token.lastUsedAt).toLocaleDateString()}`
                    : "· never used"}
                </p>
              </div>
              {isAdmin && !token.revokedAt && (
                <button
                  type="button"
                  onClick={() => revoke(token.id)}
                  className="rounded-md p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label="Revoke token"
                >
                  <TrashIcon size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
