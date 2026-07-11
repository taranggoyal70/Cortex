"use client";

import {
  ArrowsClockwiseIcon,
  HashIcon,
  PlugsIcon,
  SlackLogoIcon,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Channel = { id: string; name: string; memberCount: number };

export function SlackConnect({
  configured,
  connected,
  teamName,
  isAdmin,
}: {
  configured: boolean;
  connected: boolean;
  teamName: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Surface the OAuth callback result once.
  useEffect(() => {
    const status = params.get("slack");
    if (status === "connected") toast.success("Slack connected.");
    else if (status === "error") toast.error("Slack connection failed. Try again.");
    if (status) router.replace("/settings/connections");
  }, [params, router]);

  async function loadChannels() {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/slack/channels");
      const data = (await res.json().catch(() => ({}))) as {
        channels?: Channel[];
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(data.error?.message ?? "Could not load channels.");
      setChannels(data.channels ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load channels.");
    } finally {
      setLoadingChannels(false);
    }
  }

  async function sync(channel: Channel) {
    setSyncing(channel.id);
    try {
      const res = await fetch("/api/slack/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, channelName: channel.name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        messageCount?: number;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(data.error?.message ?? "Sync failed.");
      toast.success(
        `Synced ${data.messageCount ?? 0} messages from #${channel.name}. Extraction started.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(null);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Slack? Synced sources are kept.")) return;
    try {
      const res = await fetch("/api/slack/disconnect", { method: "POST" });
      if (!res.ok && res.status !== 204) throw new Error("Disconnect failed.");
      toast.success("Slack disconnected.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-paper">
          <SlackLogoIcon size={20} weight="fill" />
          <span className="font-semibold">Slack</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Slack isn&apos;t configured on this deployment yet. Add{" "}
          <code className="font-mono text-xs text-paper">SLACK_CLIENT_ID</code>,{" "}
          <code className="font-mono text-xs text-paper">SLACK_CLIENT_SECRET</code>, and an{" "}
          <code className="font-mono text-xs text-paper">CORTEX_ENCRYPTION_KEY</code> to enable it.
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-paper">
          <SlackLogoIcon size={20} weight="fill" />
          <span className="font-semibold">Slack</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Connect a Slack workspace to pull channel history into your brain as
          sources, then extract skills from it.
        </p>
        {isAdmin ? (
          <a
            href="/api/slack/install"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink"
          >
            <SlackLogoIcon size={16} weight="fill" />
            Connect Slack
          </a>
        ) : (
          <p className="mt-4 text-xs text-muted">Only workspace admins can connect Slack.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-paper">
          <SlackLogoIcon size={20} weight="fill" className="text-success" />
          <span className="font-semibold">Slack</span>
          {teamName && <span className="text-sm text-muted">· {teamName}</span>}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={disconnect}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-xs text-muted-light transition hover:text-danger"
          >
            <PlugsIcon size={13} />
            Disconnect
          </button>
        )}
      </div>

      <div className="mt-4">
        {channels === null ? (
          <button
            type="button"
            onClick={loadChannels}
            disabled={loadingChannels}
            className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2 text-sm text-muted-light transition hover:bg-white/5 hover:text-paper disabled:opacity-50"
          >
            <HashIcon size={15} />
            {loadingChannels ? "Loading channels…" : "Browse channels"}
          </button>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted">
            No channels found. Invite the Cortex bot to the channels you want to
            sync, then reload.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {channels.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <HashIcon size={14} className="shrink-0 text-muted" />
                <span className="flex-1 truncate text-sm text-paper">{c.name}</span>
                <span className="text-[11px] text-muted">{c.memberCount} members</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => sync(c)}
                    disabled={syncing !== null}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-accent-light hover:text-ink disabled:opacity-50"
                  >
                    <ArrowsClockwiseIcon
                      size={12}
                      weight="bold"
                      className={syncing === c.id ? "animate-spin" : ""}
                    />
                    {syncing === c.id ? "Syncing…" : "Sync & extract"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
