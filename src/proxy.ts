import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-config";

// The authed app shell and its API. The public agent endpoints
// (/api/agent/*) authenticate by bearer token, and Slack callbacks by
// OAuth state, so they are intentionally not behind the Clerk guard.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/sources(.*)",
  "/skills(.*)",
  "/review(.*)",
  "/runs(.*)",
  "/export(.*)",
  "/playground(.*)",
  "/settings(.*)",
  "/api/sources(.*)",
  "/api/skills(.*)",
  "/api/conflicts(.*)",
  "/api/extract(.*)",
  "/api/runs(.*)",
  "/api/workspaces(.*)",
  "/api/tokens(.*)",
  "/api/export(.*)",
  "/api/slack(.*)",
]);

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkConfigured()) {
    if (isProtectedRoute(request)) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "The authenticated workspace is not configured.",
            code: "workspace_not_configured",
          },
          { status: 503 },
        );
      }
      const publicUrl = request.nextUrl.clone();
      publicUrl.pathname = "/";
      publicUrl.search = "?setup=required";
      return NextResponse.redirect(publicUrl);
    }
    return NextResponse.next();
  }
  return authenticatedProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|\\.well-known/workflow/).*)",
    "/(api|trpc)(.*)",
  ],
};
