import { requireWorkspace } from "@/lib/auth";
import { buildSkillsFile, parseFormat } from "@/lib/build-skills-file";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const ctx = await requireWorkspace();
    const format = parseFormat(new URL(request.url).searchParams.get("format"));
    const file = await buildSkillsFile(ctx.workspaceId, format);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        ...(download
          ? { "Content-Disposition": `attachment; filename="${file.filename}"` }
          : {}),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
