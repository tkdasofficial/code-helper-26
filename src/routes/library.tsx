import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  Search,
  Trash2,
  ImageIcon,
  Video as VideoIcon,
  AudioLines,
  PenTool,
  Play,
  Film,
  Loader2,
  CheckCircle2,
  X,
  Eye,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { StudioLayout } from "@/components/hyper/StudioLayout";
import { cn } from "@/lib/utils";
import { deleteGeneration, listGenerations } from "@/lib/generation.functions";
import { useSession } from "@/hooks/useSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AssetKind = "Image" | "Video" | "Audio" | "Vector";

interface LibraryAsset {
  id: string;
  kind: AssetKind;
  prompt: string;
  title: string;
  src: string | null;
  meta: string;
  date: string;
  status: string;
  aspectRatio?: string | null;
  quality?: string | null;
  fileId?: string | null;
  directDownloadUrl?: string | null;
  driveUrl?: string | null;
}

interface DownloadState {
  active: boolean;
  id: string;
  title: string;
  filename: string;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  status: "downloading" | "completed" | "error";
  errorMessage?: string;
}

export const Route = createFileRoute("/library")({
  head: () =>
    pageHead({
      path: "/library",
      title: "Library \u2014 Manage Your AI Generations | Hyper Copilot",
      description:
        "Browse, search, download and preview every video, image, and audio generation in Hyper Copilot.",
      noindex: true,
      keywords: [
        "AI generation library",
        "AI video manager",
        "download AI videos",
        "AI media history",
      ],
    }),
  component: LibraryPage,
});

const kindIcon: Record<AssetKind, typeof ImageIcon> = {
  Image: ImageIcon,
  Video: VideoIcon,
  Audio: AudioLines,
  Vector: PenTool,
};

const filters = ["All", "Video", "Image", "Audio"] as const;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= gb) {
    return `${(bytes / gb).toFixed(2)} GB`;
  }
  return `${(bytes / mb).toFixed(1)} MB`;
}

function LibraryPage() {
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["generations", "library"],
    queryFn: () => listGenerations({ data: { limit: 200 } }),
    enabled: Boolean(session),
  });

  const assets: LibraryAsset[] = useMemo(
    () =>
      (data ?? []).map((g) => ({
        id: g.id,
        kind: (g.kind === "video" ? "Video" : g.kind === "audio" ? "Audio" : "Image") as AssetKind,
        prompt: g.prompt,
        title: g.title || g.prompt,
        src: g.directDownloadUrl || g.url,
        meta: g.model,
        date: new Date(g.createdAt).toLocaleDateString(),
        status: g.status,
        aspectRatio: g.aspectRatio,
        quality: g.quality,
        fileId: g.fileId,
        directDownloadUrl: g.directDownloadUrl,
        driveUrl: g.driveUrl,
      })),
    [data],
  );

  const remove = useMutation({
    mutationFn: (id: string) => deleteGeneration({ data: { id } }),
    onSuccess: () => {
      toast.success("Asset deleted");
      void queryClient.invalidateQueries({ queryKey: ["generations"] });
      if (selectedAssetForOptions?.id) {
        setSelectedAssetForOptions(null);
      }
      if (previewAsset?.id) {
        setPreviewAsset(null);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete"),
  });

  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  // Video Options Modal State
  const [selectedAssetForOptions, setSelectedAssetForOptions] = useState<LibraryAsset | null>(null);

  // Video Preview Modal State
  const [previewAsset, setPreviewAsset] = useState<LibraryAsset | null>(null);
  const [previewBuffering, setPreviewBuffering] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewTimerRef = useRef<number | null>(null);

  // Active Download Notification Bar State
  const [downloadState, setDownloadState] = useState<DownloadState | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (filter === "All" || a.kind === filter) &&
        (!q || a.prompt.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)),
    );
  }, [assets, filter, query]);

  // Handle Video Options Tap
  const handleOpenOptions = (asset: LibraryAsset) => {
    setSelectedAssetForOptions(asset);
  };

  // Handle Video Preview with Temporary Download indicator
  const handlePreview = (asset: LibraryAsset) => {
    setSelectedAssetForOptions(null);
    setPreviewAsset(asset);
    setPreviewBuffering(true);
    setPreviewProgress(15);

    toast.info("Temporary download started to show preview...", {
      description: asset.title.slice(0, 50),
      duration: 3500,
    });

    if (previewTimerRef.current) {
      window.clearInterval(previewTimerRef.current);
    }

    let p = 20;
    previewTimerRef.current = window.setInterval(() => {
      p = Math.min(92, p + 18);
      setPreviewProgress(p);
    }, 200);
  };

  // Handle Video Download with Notification Bar showing download% and MB/GB
  const handleDownload = async (asset: LibraryAsset) => {
    setSelectedAssetForOptions(null);

    const targetUrl = asset.src || asset.directDownloadUrl;
    if (!targetUrl) {
      toast.error("No download file available yet for this video.");
      return;
    }

    const safeTitle = (asset.title || asset.prompt || "video")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const filename = `${safeTitle}.mp4`;

    const estimatedBytes = asset.aspectRatio === "16:9" ? 42 * 1024 * 1024 : 18 * 1024 * 1024;

    setDownloadState({
      active: true,
      id: asset.id,
      title: asset.title || asset.prompt || "Video Asset",
      filename,
      progress: 6,
      loadedBytes: 0,
      totalBytes: estimatedBytes,
      status: "downloading",
    });

    try {
      const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
      let response = await fetch(proxyUrl);
      if (!response.ok) {
        // Fallback to direct fetch
        response = await fetch(targetUrl);
      }

      const contentLength = Number(response.headers.get("content-length"));
      const totalBytes = contentLength && contentLength > 0 ? contentLength : estimatedBytes;

      if (!response.body) {
        throw new Error("Download stream not readable");
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const pct = Math.min(
            99,
            Math.round((receivedBytes / Math.max(receivedBytes, totalBytes)) * 100),
          );
          setDownloadState((prev) =>
            prev && prev.id === asset.id
              ? {
                  ...prev,
                  loadedBytes: receivedBytes,
                  totalBytes: Math.max(receivedBytes, totalBytes),
                  progress: Math.max(prev.progress, pct),
                }
              : prev,
          );
        }
      }

      const blob = new Blob(chunks, { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      setDownloadState((prev) =>
        prev && prev.id === asset.id
          ? {
              ...prev,
              loadedBytes: receivedBytes,
              totalBytes: receivedBytes,
              progress: 100,
              status: "completed",
            }
          : prev,
      );

      toast.success("Download complete!", {
        description: `${formatBytes(receivedBytes)} saved to your device.`,
      });

      setTimeout(() => {
        setDownloadState((curr) =>
          curr?.id === asset.id && curr?.status === "completed" ? null : curr,
        );
      }, 4500);
    } catch (err) {
      console.warn("[DownloadManager] Direct fallback:", err);
      // Seamless browser fallback
      const fallbackAnchor = document.createElement("a");
      fallbackAnchor.href = targetUrl;
      fallbackAnchor.download = filename;
      fallbackAnchor.target = "_blank";
      fallbackAnchor.rel = "noopener noreferrer";
      document.body.appendChild(fallbackAnchor);
      fallbackAnchor.click();
      document.body.removeChild(fallbackAnchor);

      setDownloadState((prev) =>
        prev && prev.id === asset.id
          ? {
              ...prev,
              progress: 100,
              loadedBytes: estimatedBytes,
              totalBytes: estimatedBytes,
              status: "completed",
            }
          : prev,
      );
      setTimeout(() => setDownloadState(null), 3500);
    }
  };

  return (
    <StudioLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Library</h1>
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {assets.length} assets
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Browse, preview, and download your AI-generated videos, images, and audio assets.
          </p>
        </header>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <input
              aria-label="Search library"
              placeholder="Search your generations by title or prompt..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  filter === f
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Empty States */}
        {!session && !sessionLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <p className="text-[14px] font-semibold">Sign in to view your library</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Sign in with your account to access your saved videos and creations.
            </p>
            <div className="mt-4">
              <Link
                to="/auth"
                className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-[12.5px] text-muted-foreground">Loading creations...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <p className="text-[14px] font-semibold">
              {assets.length === 0 ? "Your library is empty" : "No matching assets"}
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {assets.length === 0
                ? "Every video or asset generated with Video Agent is stored here automatically."
                : "Try a different search query or clear your filter."}
            </p>
            {assets.length === 0 ? (
              <div className="mt-4">
                <Link
                  to="/video-agent"
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Create a Video
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          /* Asset Grid */
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((a) => {
              const isVideo = a.kind === "Video";
              const Icon = kindIcon[a.kind];

              return (
                <article
                  key={a.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:border-border-strong hover:shadow-md"
                >
                  {/* Thumbnail / Ruf Video Icon Container */}
                  <div
                    onClick={() => {
                      if (isVideo) {
                        handleOpenOptions(a);
                      }
                    }}
                    className={cn(
                      "relative aspect-video w-full overflow-hidden bg-surface-2",
                      isVideo ? "cursor-pointer" : "",
                    )}
                  >
                    {isVideo ? (
                      /* Ruf Video Display Area */
                      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
                        {/* Ruf Background Pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />

                        {/* Large Centered Video Play Icon (Ruf Video Icon) */}
                        <div className="relative z-10 flex flex-col items-center gap-2 transition-transform duration-300 group-hover:scale-105">
                          <div className="grid h-13 w-13 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition-colors group-hover:bg-white/20">
                            <Play className="ml-1 h-6 w-6 fill-white" />
                          </div>
                          <span className="text-[11px] font-medium tracking-wide text-white/70">
                            Tap for options
                          </span>
                        </div>

                        {/* Top Badges */}
                        <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 backdrop-blur">
                            <VideoIcon className="h-3 w-3" strokeWidth={2.5} />
                            VIDEO
                          </span>
                        </div>

                        {a.aspectRatio || a.quality ? (
                          <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1">
                            <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-mono font-medium text-white/80 backdrop-blur">
                              {a.quality || "1080p"} · {a.aspectRatio || "16:9"}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : a.src ? (
                      a.kind === "Audio" ? (
                        <div className="grid h-full w-full place-items-center p-3">
                          <audio src={a.src} controls className="w-full" />
                        </div>
                      ) : (
                        <img
                          src={a.src}
                          alt={a.prompt}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <Icon className="h-8 w-8" strokeWidth={1.6} />
                      </div>
                    )}
                  </div>

                  {/* Card Content & Action Bar */}
                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <div className="space-y-1">
                      <p
                        className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground"
                        title={a.title || a.prompt}
                      >
                        {a.title || a.prompt}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.meta} · {a.date}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                      {isVideo ? (
                        <div className="flex w-full items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenOptions(a)}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-surface-2"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                            Options
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePreview(a)}
                              className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-surface-2"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownload(a)}
                              className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-surface-2"
                            >
                              <Download className="h-3 w-3" strokeWidth={2} />
                              Download
                            </button>
                            <button
                              type="button"
                              aria-label="Delete video"
                              onClick={() => remove.mutate(a.id)}
                              className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex w-full items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              if (!a.src) {
                                toast.error("This asset has no file available.");
                                return;
                              }
                              window.open(a.src, "_blank", "noopener");
                            }}
                            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" strokeWidth={2} />
                            Download
                          </button>
                          <button
                            type="button"
                            aria-label="Delete asset"
                            onClick={() => remove.mutate(a.id)}
                            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Video Options Modal: Triggered when user taps video icon/card */}
        <Dialog
          open={Boolean(selectedAssetForOptions)}
          onOpenChange={(open) => !open && setSelectedAssetForOptions(null)}
        >
          <DialogContent className="max-w-md rounded-2xl p-5 border-border bg-background shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                  <Film className="h-3 w-3" />
                  Video Options
                </span>
                {selectedAssetForOptions?.quality ? (
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {selectedAssetForOptions.quality}
                  </span>
                ) : null}
              </div>
              <DialogTitle className="text-base font-bold leading-tight">
                {selectedAssetForOptions?.title || selectedAssetForOptions?.prompt}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground">
                Choose an action for this video generation.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              {/* Option 1: Preview */}
              <button
                type="button"
                onClick={() => {
                  if (selectedAssetForOptions) handlePreview(selectedAssetForOptions);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Play className="h-4 w-4 fill-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Preview Video</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Temporary download buffers to stream full preview
                    </p>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Option 2: Download */}
              <button
                type="button"
                onClick={() => {
                  if (selectedAssetForOptions) void handleDownload(selectedAssetForOptions);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Download className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Download MP4</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Downloads with live notification bar (% & MB/GB size)
                    </p>
                  </div>
                </div>
                <span className="text-[11.5px] font-mono text-muted-foreground">MP4</span>
              </button>

              {/* Option 3: Delete */}
              <button
                type="button"
                onClick={() => {
                  if (selectedAssetForOptions) remove.mutate(selectedAssetForOptions.id);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-surface/30 p-3.5 text-left transition-colors hover:border-destructive/40 hover:bg-destructive/10"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-destructive">Delete Video</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Permanently remove video asset from storage
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video Preview Modal with Temporary Download Indicator */}
        <Dialog
          open={Boolean(previewAsset)}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewAsset(null);
              setPreviewBuffering(false);
              if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
            }
          }}
        >
          <DialogContent className="max-w-3xl rounded-2xl p-4 sm:p-6 border-border bg-background shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2 pr-6">
                <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-primary">
                  <Play className="h-3 w-3 fill-current" />
                  Video Preview
                </span>
                {previewAsset?.aspectRatio ? (
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {previewAsset.aspectRatio}
                  </span>
                ) : null}
              </div>
              <DialogTitle className="line-clamp-1 text-base font-bold">
                {previewAsset?.title || previewAsset?.prompt}
              </DialogTitle>
            </DialogHeader>

            {/* Temporary download progress indicator */}
            {previewBuffering ? (
              <div className="mt-2 space-y-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 font-medium text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Temporary download started to show preview...
                  </span>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {previewProgress}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${previewProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Video Player Display */}
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black">
              {previewAsset?.src ? (
                <video
                  src={previewAsset.src}
                  controls
                  autoPlay
                  playsInline
                  onLoadedData={() => {
                    setPreviewBuffering(false);
                    setPreviewProgress(100);
                    if (previewTimerRef.current) window.clearInterval(previewTimerRef.current);
                  }}
                  onCanPlay={() => {
                    setPreviewBuffering(false);
                    setPreviewProgress(100);
                  }}
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <div className="grid h-64 place-items-center text-muted-foreground">
                  <p className="text-[13px]">Video playback link not available.</p>
                </div>
              )}
            </div>

            {/* Preview Modal Actions */}
            <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border">
              <p className="text-[11.5px] text-muted-foreground">
                Rendered with Headless Video Engine
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (previewAsset) void handleDownload(previewAsset);
                  }}
                  className="rounded-full bg-foreground font-semibold text-background hover:bg-foreground/90"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download MP4
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewAsset(null)}
                  className="rounded-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Download Notification Bar: shows download% with size (MB/GB) */}
        {downloadState && downloadState.active ? (
          <aside
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {downloadState.status === "downloading" ? (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-foreground">
                    {downloadState.status === "downloading"
                      ? `Downloading: ${downloadState.title}`
                      : `Download complete: ${downloadState.title}`}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground font-mono">
                    {formatBytes(downloadState.loadedBytes)} /{" "}
                    {formatBytes(downloadState.totalBytes)} ({downloadState.progress}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] font-bold font-mono text-foreground">
                  {downloadState.progress}%
                </span>
                <button
                  type="button"
                  aria-label="Close notification"
                  onClick={() => setDownloadState(null)}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Smooth animated progress bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full transition-all duration-200",
                  downloadState.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-red-500 via-purple-500 to-blue-500",
                )}
                style={{ width: `${downloadState.progress}%` }}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </StudioLayout>
  );
}
