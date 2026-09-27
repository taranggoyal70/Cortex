import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-config";

export const dynamic = "force-dynamic";

export function GET() {
  const checks = {
    auth: isClerkConfigured(),
    database: Boolean(process.env.DATABASE_URL?.trim()),
    model: Boolean(process.env.GITHUB_MODELS_TOKEN?.trim()),
  };
  const workspaceReady = checks.auth && checks.database;

  return NextResponse.json(
    {
      status: workspaceReady ? "ready" : "degraded",
      publicSite: "ready",
      workspace: workspaceReady ? "ready" : "configuration_required",
      extraction: checks.model ? "ready" : "configuration_required",
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: workspaceReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
