import { authorizePipelineRequest, json } from "@/lib/pipeline-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { invokeEdgeFunction } from "@/lib/edge-functions.server";
import { runWorkerPass } from "@/lib/jobs-worker.server";

export async function POST(request: Request) {
  if (!(await authorizePipelineRequest(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Trigger edge function for background job processing
  void invokeEdgeFunction("handle-job-execution");

  return json(await runWorkerPass(supabaseAdmin));
}
