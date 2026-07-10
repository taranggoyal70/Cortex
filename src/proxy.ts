import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|\\.well-known/workflow/).*)",
    "/(api|trpc)(.*)",
  ],
};
