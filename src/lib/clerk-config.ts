/**
 * Clerk is required for the authenticated workspace, but the public product
 * page should still render in a fresh checkout. Keeping this check in one
 * place prevents the provider, middleware, and landing page from disagreeing
 * about whether authentication is available.
 */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}
