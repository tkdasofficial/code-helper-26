import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GenerationKind = "image" | "video" | "audio";

export type GenerationRecord = {
  id: string;
  kind: GenerationKind;
  model: string;
  prompt: string;
  title?: string | null;
  status: string;
  url: string | null;
  fileId?: string | null;
  directDownloadUrl?: string | null;
  driveUrl?: string | null;
  error: string | null;
  createdAt: string;
  aspectRatio?: string | null;
  quality?: string | null;
};

/** Uploads a browser file (as a data URL) so providers can read it over HTTPS. */
export const uploadReference = createServerFn({ method: "POST", name: "uploadReference" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string }) => input)
  .handler(async ({ data, context }) => {
    const { dataUrlToBytes, uploadBytes, referenceUrl, GENERATIONS_BUCKET } =
      await import("@/lib/storage.server");
    const { bytes, contentType } = dataUrlToBytes(data.dataUrl);
    const path = await uploadBytes(GENERATIONS_BUCKET, context.userId, bytes, contentType);
    // Providers reject reference images over 1MB, so hand them a compressed
    // transformation URL instead of the raw (often multi-MB PNG) upload.
    return { path, url: await referenceUrl(GENERATIONS_BUCKET, path) };
  });

(uploadReference as any).__name = "uploadReference";

/** Saves an image that was streamed straight to the browser. */
export const saveImageResult = createServerFn({ method: "POST", name: "saveImageResult" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { dataUrl: string; prompt: string; model: string; aspect?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const storage = await import("@/lib/storage.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bytes, contentType } = storage.dataUrlToBytes(data.dataUrl);
    const path = await storage.uploadBytes(
      storage.GENERATIONS_BUCKET,
      context.userId,
      bytes,
      contentType,
    );
    const { data: row, error } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: context.userId,
        kind: "image",
        model: data.model,
        prompt: data.prompt,
        status: "completed",
        storage_path: path,
        params: { aspect: data.aspect ?? "1:1" },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** The signed-in user's generations, newest first, with fresh signed URLs and Google Drive links. */
(saveImageResult as any).__name = "saveImageResult";

export const listGenerations = createServerFn({ method: "POST", name: "listGenerations" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind?: GenerationKind; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<GenerationRecord[]> => {
    const storage = await import("@/lib/storage.server");
    const limit = data.limit ?? 100;

    // 1. Fetch from generations table
    let genQuery = context.supabase
      .from("generations")
      .select("id, kind, model, prompt, status, error, storage_path, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.kind) genQuery = genQuery.eq("kind", data.kind);

    const { data: rows } = await genQuery;
    const paths = (rows ?? []).map((r) => r.storage_path).filter((p): p is string => !!p);
    const urls = await storage.signedUrls(storage.GENERATIONS_BUCKET, paths);

    const mappedGenerations: GenerationRecord[] = (rows ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as GenerationKind,
      model: r.model,
      prompt: r.prompt,
      title: null,
      status: r.status,
      error: r.error,
      createdAt: r.created_at,
      url: r.storage_path ? (urls[r.storage_path] ?? null) : null,
    }));

    // 2. Fetch from videos table (when not restricted to image/audio)
    let mappedVideos: GenerationRecord[] = [];
    if (!data.kind || data.kind === "video") {
      const { data: videoRows } = await context.supabase
        .from("videos")
        .select(
          "id, prompt, title, status, error, video_url, file_id, direct_download_url, quality, aspect_ratio, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      const storageVideoPaths: string[] = [];
      for (const v of videoRows ?? []) {
        if (v.video_url && !v.video_url.startsWith("http") && !v.direct_download_url) {
          storageVideoPaths.push(v.video_url.replace(/^videos\//, ""));
        }
      }

      const videoSignedUrls =
        storageVideoPaths.length > 0
          ? ((await storage
              .signedUrls(storage.VIDEOS_BUCKET, storageVideoPaths)
              .catch(() => ({}))) as Record<string, string>)
          : {};

      mappedVideos = (videoRows ?? []).map((v) => {
        let directUrl: string | null = v.direct_download_url ?? null;
        let driveUrl: string | null = null;
        if (v.file_id) {
          driveUrl = `https://drive.google.com/file/d/${v.file_id}/view`;
          if (!directUrl) {
            directUrl = `https://drive.google.com/uc?export=download&id=${v.file_id}`;
          }
        }
        let url: string | null = directUrl;
        if (!url && v.video_url) {
          if (v.video_url.startsWith("http")) {
            url = v.video_url;
          } else {
            const stripped = v.video_url.replace(/^videos\//, "");
            if (videoSignedUrls[stripped]) {
              url = videoSignedUrls[stripped];
            }
          }
        }

        return {
          id: v.id,
          kind: "video" as const,
          model: `Video Engine (${v.quality ?? "1080p"})`,
          prompt: v.prompt || v.title || "AI Generated Video",
          title: v.title || v.prompt || "Video Generation",
          status: v.status,
          url,
          fileId: v.file_id,
          directDownloadUrl: directUrl,
          driveUrl,
          error: v.error,
          createdAt: v.created_at,
          aspectRatio: v.aspect_ratio,
          quality: v.quality,
        };
      });
    }

    // Merge and deduplicate by id
    const combinedMap = new Map<string, GenerationRecord>();
    for (const item of mappedVideos) {
      combinedMap.set(item.id, item);
    }
    for (const item of mappedGenerations) {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }

    const all = Array.from(combinedMap.values());
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all.slice(0, limit);
  });

(listGenerations as any).__name = "listGenerations";

export const deleteGeneration = createServerFn({ method: "POST", name: "deleteGeneration" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    // Delete from videos if present
    await context.supabase.from("videos").delete().eq("id", data.id);

    // Delete from generations if present
    const storage = await import("@/lib/storage.server");
    const { data: row } = await context.supabase
      .from("generations")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();

    await context.supabase.from("generations").delete().eq("id", data.id);
    if (row?.storage_path) {
      await storage.removeFiles(storage.GENERATIONS_BUCKET, [row.storage_path]).catch(() => {});
    }

    return { ok: true };
  });
(deleteGeneration as any).__name = "deleteGeneration";

