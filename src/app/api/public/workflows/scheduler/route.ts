import { authorizePipelineRequest, json, readJsonBody } from "@/lib/pipeline-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { invokeEdgeFunction } from "@/lib/edge-functions.server";
import { runSchedulerPass } from "@/lib/workflow-scheduler.server";

export async function POST(request: Request) {
  if (!(await authorizePipelineRequest(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await readJsonBody(request);
  const workflowId = typeof body["workflow_id"] === "string" ? body["workflow_id"] : null;

  // Trigger process-scheduled-cron edge function
  void invokeEdgeFunction("process-scheduled-cron", workflowId ? { workflowId } : {});

  const handled = await runSchedulerPass(supabaseAdmin, { workflowId });
  return json({ ok: true, handled });
}
