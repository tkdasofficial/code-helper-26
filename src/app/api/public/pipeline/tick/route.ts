import { authorizePipelineRequest, json } from "@/lib/pipeline-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { invokeEdgeFunction } from "@/lib/edge-functions.server";
import { dispatchPendingRenders } from "@/lib/video-agent.server";
import { runSchedulerPass } from "@/lib/workflow-scheduler.server";
import { runWorkerPass } from "@/lib/jobs-worker.server";

export async function POST(request: Request) {
  if (!(await authorizePipelineRequest(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Trigger edge functions asynchronously for full pipeline execution
  void invokeEdgeFunction("process-scheduled-cron");
  void invokeEdgeFunction("handle-job-execution");

  const renders = await dispatchPendingRenders(supabaseAdmin, { olderThanSeconds: 30 });
  const workflows = await runSchedulerPass(supabaseAdmin);
  const jobs = await runWorkerPass(supabaseAdmin, { budgetMs: 45_000 });

  return json({ ok: true, renders, workflows, jobs });
}
