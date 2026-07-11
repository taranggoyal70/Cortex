import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { connectorAccounts } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { ingestSource } from "@/lib/sources";

// Bot scopes: read channel lists and message history for public + private
// channels the bot is a member of.
const SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "team:read",
  "users:read",
];

export function slackConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.CORTEX_ENCRYPTION_KEY,
  );
}

function requireSlackConfig() {
  const env = getServerEnv();
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new AppError(
      "Slack is not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.",
      503,
      "slack_not_configured",
    );
  }
  return { clientId: env.SLACK_CLIENT_ID, clientSecret: env.SLACK_CLIENT_SECRET };
}

export function redirectUri(): string {
  return `${getServerEnv().NEXT_PUBLIC_APP_URL}/api/slack/callback`;
}

export function installUrl(state: string): string {
  const { clientId } = requireSlackConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES.join(","),
    redirect_uri: redirectUri(),
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

type SlackResponse = { ok: boolean; error?: string } & Record<string, unknown>;

async function slackGet(
  method: string,
  token: string,
  params: Record<string, string> = {},
): Promise<SlackResponse> {
  const url = `https://slack.com/api/${method}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as SlackResponse;
  if (!data.ok) {
    throw new AppError(`Slack API error: ${data.error}`, 502, "slack_api_error");
  }
  return data;
}

export async function exchangeCode(code: string) {
  const { clientId, clientSecret } = requireSlackConfig();
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri(),
    }),
  });
  const data = (await res.json()) as SlackResponse & {
    access_token?: string;
    scope?: string;
    bot_user_id?: string;
    team?: { id?: string; name?: string };
  };
  if (!data.ok || !data.access_token || !data.team?.id) {
    throw new AppError(
      `Slack authorization failed: ${data.error ?? "unknown"}`,
      502,
      "slack_oauth_failed",
    );
  }
  return {
    accessToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name ?? data.team.id,
    botUserId: data.bot_user_id ?? null,
    scopes: data.scope ? data.scope.split(",") : [],
  };
}

export async function saveInstallation(input: {
  workspaceId: string;
  installedBy: string;
  accessToken: string;
  teamId: string;
  teamName: string;
  botUserId: string | null;
  scopes: string[];
}) {
  const db = getDb();
  const values = {
    workspaceId: input.workspaceId,
    provider: "slack",
    externalTeamId: input.teamId,
    accessTokenEnc: encryptSecret(input.accessToken),
    scopes: input.scopes,
    botUserId: input.botUserId,
    metadata: { teamName: input.teamName },
    installedBy: input.installedBy,
    updatedAt: new Date(),
  };
  await db
    .insert(connectorAccounts)
    .values(values)
    .onConflictDoUpdate({
      target: [
        connectorAccounts.workspaceId,
        connectorAccounts.provider,
        connectorAccounts.externalTeamId,
      ],
      set: {
        accessTokenEnc: values.accessTokenEnc,
        scopes: values.scopes,
        botUserId: values.botUserId,
        metadata: values.metadata,
        updatedAt: values.updatedAt,
      },
    });
}

export async function getSlackConnection(workspaceId: string) {
  const [row] = await getDb()
    .select()
    .from(connectorAccounts)
    .where(
      and(
        eq(connectorAccounts.workspaceId, workspaceId),
        eq(connectorAccounts.provider, "slack"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function disconnectSlack(workspaceId: string) {
  await getDb()
    .delete(connectorAccounts)
    .where(
      and(
        eq(connectorAccounts.workspaceId, workspaceId),
        eq(connectorAccounts.provider, "slack"),
      ),
    );
}

export type SlackChannel = { id: string; name: string; memberCount: number };

export async function listChannels(workspaceId: string): Promise<SlackChannel[]> {
  const conn = await getSlackConnection(workspaceId);
  if (!conn) throw new AppError("Slack is not connected.", 409, "slack_not_connected");
  const token = decryptSecret(conn.accessTokenEnc);
  const data = (await slackGet("conversations.list", token, {
    types: "public_channel,private_channel",
    exclude_archived: "true",
    limit: "200",
  })) as SlackResponse & {
    channels?: { id: string; name: string; num_members?: number }[];
  };
  return (data.channels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    memberCount: c.num_members ?? 0,
  }));
}

/**
 * Pull recent history from a channel, format it as a readable transcript, and
 * ingest it as a Slack source. Returns the source id (or null if empty).
 */
export async function syncChannel(input: {
  workspaceId: string;
  createdBy: string;
  channelId: string;
  channelName: string;
}): Promise<{ sourceId: string | null; messageCount: number }> {
  const conn = await getSlackConnection(input.workspaceId);
  if (!conn) throw new AppError("Slack is not connected.", 409, "slack_not_connected");
  const token = decryptSecret(conn.accessTokenEnc);

  const data = (await slackGet("conversations.history", token, {
    channel: input.channelId,
    limit: "200",
  })) as SlackResponse & {
    messages?: { user?: string; text?: string; ts?: string; subtype?: string }[];
  };

  // Oldest-first, skip join/leave/system noise and empty messages.
  const messages = (data.messages ?? [])
    .filter((m) => m.text && !m.subtype)
    .reverse();
  if (messages.length === 0) return { sourceId: null, messageCount: 0 };

  // Resolve user ids to display names once.
  const userIds = [...new Set(messages.map((m) => m.user).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  for (const uid of userIds) {
    try {
      const u = (await slackGet("users.info", token, { user: uid })) as SlackResponse & {
        user?: { real_name?: string; name?: string };
      };
      names.set(uid, u.user?.real_name || u.user?.name || uid);
    } catch {
      names.set(uid, uid);
    }
  }

  const transcript = messages
    .map((m) => `${names.get(m.user ?? "") ?? "unknown"}: ${cleanText(m.text ?? "", names)}`)
    .join("\n");

  const source = await ingestSource({
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    type: "slack",
    title: `#${input.channelName} — Slack`,
    content: transcript,
    origin: { channel: input.channelName },
  });

  return { sourceId: source.id, messageCount: messages.length };
}

// Replace <@U123> user mentions with @Name for readability.
function cleanText(text: string, names: Map<string, string>): string {
  return text.replace(/<@([A-Z0-9]+)>/g, (_, id) => `@${names.get(id) ?? id}`);
}
