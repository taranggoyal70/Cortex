import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { getDb } from "@/db";
import { users, workspaces } from "@/db/schema";
import { AppError } from "@/lib/errors";

/** Validates the Clerk session and mirrors the user into our users table. */
export async function requireUser() {
  const session = await auth();
  if (!session.userId) {
    throw new AppError("Authentication required.", 401, "unauthenticated");
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(session.userId);
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? null;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    primaryEmail;

  await getDb()
    .insert(users)
    .values({
      id: clerkUser.id,
      email: primaryEmail,
      displayName,
      avatarUrl: clerkUser.imageUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: primaryEmail,
        displayName,
        avatarUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    });

  return {
    id: clerkUser.id,
    email: primaryEmail,
    displayName,
    avatarUrl: clerkUser.imageUrl,
  };
}

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  role: string;
  isAdmin: boolean;
};

/**
 * The core multi-tenant guard. Returns the active Clerk organization as the
 * workspace, scoped from the session — never from request input. Every
 * workspace-owned query MUST derive its workspaceId from here.
 */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const session = await auth();
  if (!session.userId) {
    throw new AppError("Authentication required.", 401, "unauthenticated");
  }
  if (!session.orgId) {
    throw new AppError(
      "Select or create a workspace to continue.",
      409,
      "workspace_required",
    );
  }

  // Ensure a thin workspace row exists (Clerk org is the source of truth).
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: session.orgId,
  });
  await getDb()
    .insert(workspaces)
    .values({ id: session.orgId, name: org.name, slug: org.slug ?? session.orgId })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: { name: org.name, slug: org.slug ?? session.orgId, updatedAt: new Date() },
    });

  const role = session.orgRole ?? "org:member";
  return {
    userId: session.userId,
    workspaceId: session.orgId,
    role,
    isAdmin: role === "org:admin",
  };
}

/** Admin-only guard for edit/approve/destructive actions. */
export async function requireWorkspaceAdmin(): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace();
  if (!ctx.isAdmin) {
    throw new AppError(
      "This action requires a workspace admin.",
      403,
      "admin_required",
    );
  }
  return ctx;
}
