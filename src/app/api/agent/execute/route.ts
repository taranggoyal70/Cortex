import { requireWorkspace } from "@/lib/auth";
import { useScenarioSchema } from "@/lib/domain/skill";
import { toErrorResponse } from "@/lib/errors";
import { runScenario } from "@/lib/playground";

// Session-authed: the in-app "use it" demo. (The token-authed pull lives at
// /api/agent/skills; this endpoint runs a scenario against the compiled brain.)
export async function POST(request: Request) {
  try {
    const ctx = await requireWorkspace();
    const { scenario } = useScenarioSchema.parse(await request.json());
    const outcome = await runScenario(ctx.workspaceId, scenario);
    return Response.json(outcome);
  } catch (error) {
    return toErrorResponse(error);
  }
}
