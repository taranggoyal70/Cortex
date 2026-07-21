import { resolveApiToken } from "@/lib/api-token";
import { buildSkillsFile, parseFormat } from "@/lib/build-skills-file";
import { getApprovedSkills } from "@/lib/skills";

// Model Context Protocol endpoint (Streamable HTTP). This is how an AI agent
// "loads the company brain" as live tools instead of a static file: point an
// MCP client at POST /api/mcp with `Authorization: Bearer <api token>`.
//
// Like /api/agent/*, it authenticates by bearer token and is intentionally not
// behind the Clerk guard (see proxy.ts). Tool calls are read-only.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "cortex", version: "0.2.0" } as const;

const TOOLS = [
  {
    name: "list_skills",
    description:
      "List the workspace's approved skills (slug, name, category, when to use, confidence).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_skill",
    description: "Get one approved skill in full (steps, guardrails, citations) by its slug.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "The skill slug." } },
      required: ["slug"],
    },
  },
  {
    name: "get_skills_file",
    description:
      "Get the entire compiled skills file the agent can execute. Format: md | json | yaml.",
    inputSchema: {
      type: "object",
      properties: { format: { type: "string", enum: ["md", "json", "yaml"] } },
    },
  },
];

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  id?: JsonRpcId;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: JsonRpcId, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});
const text = (value: string) => ({ content: [{ type: "text", text: value }] });

async function callTool(workspaceId: string, name: string | undefined, args: Record<string, unknown>) {
  if (name === "list_skills") {
    const rows = await getApprovedSkills(workspaceId);
    const summary = rows.map((row) => ({
      slug: row.body.slug ?? row.slug,
      name: row.body.name,
      category: row.body.category,
      whenToUse: row.body.whenToUse,
      confidence: row.body.confidence,
    }));
    return text(JSON.stringify(summary, null, 2));
  }
  if (name === "get_skill") {
    const slug = String(args.slug ?? "");
    const rows = await getApprovedSkills(workspaceId);
    const row = rows.find((candidate) => candidate.slug === slug || candidate.body.slug === slug);
    if (!row) return text(`No approved skill with slug "${slug}".`);
    return text(JSON.stringify({ ...row.body, citations: row.citations }, null, 2));
  }
  if (name === "get_skills_file") {
    const file = await buildSkillsFile(workspaceId, parseFormat(String(args.format ?? "md")));
    return text(file.body);
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function POST(request: Request) {
  let message: JsonRpcRequest;
  try {
    message = (await request.json()) as JsonRpcRequest;
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"));
  }

  const id = (message.id ?? null) as JsonRpcId;
  const method = message.method;

  try {
    if (method === "initialize") {
      return Response.json(
        rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        }),
      );
    }
    if (method?.startsWith("notifications/")) {
      return new Response(null, { status: 202 });
    }
    if (method === "tools/list") {
      return Response.json(rpcResult(id, { tools: TOOLS }));
    }
    if (method === "tools/call") {
      const { workspaceId } = await resolveApiToken(request.headers.get("authorization"));
      const result = await callTool(workspaceId, message.params?.name, message.params?.arguments ?? {});
      return Response.json(rpcResult(id, result));
    }
    return Response.json(rpcError(id, -32601, `Method not found: ${method ?? "(none)"}`));
  } catch (error) {
    return Response.json(
      rpcError(id, -32603, error instanceof Error ? error.message : "Internal error"),
    );
  }
}
