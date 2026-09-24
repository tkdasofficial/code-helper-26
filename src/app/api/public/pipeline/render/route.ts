import { authorizePipelineRequest, json, readJsonBody } from "@/lib/pipeline-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchPendingRenders } from "@/lib/video-agent.server";

export async function POST(request: Request) {
  if (!(await authorizePipelineRequest(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await readJsonBody(request);
  const videoId = typeof body["video_id"] === "string" ? body["video_id"] : null;

  const dispatched = await dispatchPendingRenders(supabaseAdmin, { videoId });
  return json({ ok: true, dispatched });
}
