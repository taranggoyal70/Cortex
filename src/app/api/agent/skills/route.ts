import { resolveApiToken } from "@/lib/api-token";
import { buildSkillsFile, parseFormat } from "@/lib/build-skills-file";
import { toErrorResponse } from "@/lib/errors";

// Token-authed pull — how an external agent "loads the company brain".
// Not behind Clerk (see proxy.ts); authenticates by bearer API token.
export async function GET(request: Request) {
  try {
    const { workspaceId } = await resolveApiToken(
      request.headers.get("authorization"),
    );
    const format = parseFormat(new URL(request.url).searchParams.get("format"));
    const file = await buildSkillsFile(workspaceId, format);
    return new Response(file.body, {
      headers: { "Content-Type": file.contentType },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
