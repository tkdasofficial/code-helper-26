import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pageHead } from "@/lib/seo";
import { StudioLayout } from "@/components/hyper/StudioLayout";
import { RecentCreations } from "@/components/hyper/RecentCreations";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/config";
import { startVideoRender } from "@/lib/video-agent.functions";
import { Panel, Segment, SliderRow, SwitchRow, TextRow } from "@/components/hyper/StudioControls";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/video-agent")({
  head: () =>
    pageHead({
      path: "/video-agent",
      title: "Video Agent | Hyper Copilot",
      description:
        "Clean, high-performance AI video studio for long-form documentaries and short-form reels.",
      ogTitle: "Video Agent — Long-Form & Short-Form Studio",
      breadcrumbs: [{ name: "Video Agent", path: "/video-agent" }],
    }),
  component: VideoAgent,
});

const CATEGORIES = [
  "Documentary",
  "Business & Finance",
  "Science & Technology",
  "Motivation",
  "Travel & Lifestyle",
  "Horror & Mystery",
  "News & Facts",
] as const;

const VISUAL_STYLES = [
  "Cinematic",
  "Realistic",
  "Corporate",
  "3D Render",
  "Cyberpunk",
  "Minimalist",
] as const;

const RESOLUTIONS = ["720p HD", "1080p Full HD"] as const;
const FRAME_RATES = ["30 FPS", "60 FPS"] as const;
const VOICE_GENDERS = ["Male", "Female"] as const;
const CAPTION_STYLES = ["Minimal", "Bold", "Dynamic"] as const;
const CAPTION_SIZES = ["Small", "Medium", "Large"] as const;
const MODES = ["Long-form", "Short-form"] as const;

function VideoAgent() {
  const [mode, setMode] = useState<"short" | "long">("long");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");

  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("1080p Full HD");
  const [fps, setFps] = useState<(typeof FRAME_RATES)[number]>("60 FPS");
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [durationSecondsShort, setDurationSecondsShort] = useState(15);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Documentary");
  const [visualStyle, setVisualStyle] = useState<(typeof VISUAL_STYLES)[number]>("Cinematic");

  const [voiceGender, setVoiceGender] = useState<(typeof VOICE_GENDERS)[number]>("Male");
  const [bgm, setBgm] = useState(true);

  const [captions, setCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<(typeof CAPTION_STYLES)[number]>("Dynamic");
  const [captionSize, setCaptionSize] = useState<(typeof CAPTION_SIZES)[number]>("Medium");

  const [busy, setBusy] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const start = useServerFn(startVideoRender);

  useEffect(() => {
    if (!videoId) return;

    const apply = (row: Record<string, unknown> | null) => {
      if (!row) return;

      const rowStatus = String(row["status"] ?? "");
      if (rowStatus === "completed") {
        setVideoId(null);
        void queryClient.invalidateQueries({ queryKey: ["generations"] });
        toast.success("Video ready!", {
          description: "Your video has completed and is saved in your Library.",
        });
      } else if (rowStatus === "failed") {
        const msg =
          typeof row["error"] === "string" && row["error"] ? row["error"] : "Generation failed";
        setVideoId(null);
        toast.error(msg);
      }
    };

    const channel = supabase
      .channel(`videos:${videoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "videos", filter: `id=eq.${videoId}` },
        (payload) => apply(payload.new as Record<string, unknown>),
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void supabase
        .from("videos")
        .select("status, error")
        .eq("id", videoId)
        .maybeSingle()
        .then(({ data }) => apply(data as Record<string, unknown> | null));
    }, 4000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [videoId, queryClient]);

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a video topic or instruction.");
      return;
    }

    setBusy(true);

    const resToken = resolution.includes("720") ? "720p" : "1080p";
    const fpsToken = fps.includes("30") ? "30" : "60";
    const durationSeconds = mode === "long" ? durationMinutes * 60 : durationSecondsShort;

    try {
      const { videoId: id } = await start({
        data: {
          mode,
          prompt: prompt.trim(),
          negative_prompt: negative.trim(),
          category,
          visual_style: visualStyle,
          resolution: resToken,
          fps: fpsToken,
          duration_minutes: mode === "long" ? durationMinutes : undefined,
          duration_seconds: durationSeconds,
          voice_gender: voiceGender.toLowerCase(),
          bgm,
          captions,
          caption_style: captionStyle,
          caption_size: captionSize,
          aspect_ratio: mode === "long" ? "16:9" : "9:16",
        },
      });

      toast.success("Job started", {
        description:
          "Your video generation has begun. It will be saved in your Library once ready.",
      });
      setVideoId(id);
      setBusy(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start generation";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <StudioLayout>
      <div className="space-y-3.5">
        <div className="rounded-2xl border border-border bg-surface/50 p-3.5">
          <Segment
            options={MODES}
            value={mode === "long" ? "Long-form" : "Short-form"}
            onChange={(v) => setMode(v === "Long-form" ? "long" : "short")}
          />
          <div className="mt-3.5">
            <TextRow
              label={mode === "long" ? "Documentary idea / topic" : "Short-form idea"}
              value={prompt}
              onChange={setPrompt}
              rows={3}
              placeholder={
                mode === "long"
                  ? "Deep ocean trenches and the creatures that survive there…"
                  : "A 15-second hook about the deepest place on Earth…"
              }
            />
          </div>
          <div className="mt-3.5">
            <TextRow
              label="Negative prompt"
              value={negative}
              onChange={setNegative}
              rows={2}
              placeholder="blurry, glitch, text watermarks, cartoon"
            />
          </div>
        </div>

        <Panel
          title="Format"
          summary={`${mode === "long" ? "16:9" : "9:16"} · ${resolution.replace(" Full HD", "").replace(" HD", "")} · ${fps} · ${mode === "long" ? `${durationMinutes} min` : `${durationSecondsShort}s`}`}
          defaultOpen
        >
          <Segment
            label="Resolution"
            options={RESOLUTIONS}
            value={resolution}
            onChange={setResolution}
          />
          <Segment label="Frame rate" options={FRAME_RATES} value={fps} onChange={setFps} />
          {mode === "long" ? (
            <SliderRow
              label="Duration"
              value={durationMinutes}
              onChange={setDurationMinutes}
              min={1}
              max={15}
              suffix=" min"
            />
          ) : (
            <SliderRow
              label="Duration"
              value={durationSecondsShort}
              onChange={setDurationSecondsShort}
              min={5}
              max={60}
              step={5}
              suffix="s"
            />
          )}
        </Panel>

        <Panel title="Story & style" summary={`${category} · ${visualStyle}`}>
          <Segment label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
          <Segment
            label="Visual style"
            options={VISUAL_STYLES}
            value={visualStyle}
            onChange={setVisualStyle}
          />
        </Panel>

        <Panel title="Audio" summary={`${voiceGender} voice · ${bgm ? "Music on" : "No music"}`}>
          <Segment
            label="Voice gender"
            options={VOICE_GENDERS}
            value={voiceGender}
            onChange={setVoiceGender}
          />
          <SwitchRow
            label="Background music"
            desc="Adds a licensed score under the voiceover"
            checked={bgm}
            onCheckedChange={setBgm}
          />
        </Panel>

        <Panel title="Captions" summary={captions ? `${captionStyle} · ${captionSize}` : "Off"}>
          <SwitchRow
            label="Burn-in captions"
            desc="Word-synced subtitles on the final video"
            checked={captions}
            onCheckedChange={setCaptions}
          />
          {captions ? (
            <>
              <Segment
                label="Style"
                options={CAPTION_STYLES}
                value={captionStyle}
                onChange={setCaptionStyle}
              />
              <Segment
                label="Size"
                options={CAPTION_SIZES}
                value={captionSize}
                onChange={setCaptionSize}
              />
            </>
          ) : null}
        </Panel>

        <Button
          type="button"
          id="generate-video-action-btn"
          disabled={busy}
          onClick={() => void handleGenerateVideo()}
          className="h-11 w-full rounded-full text-[14px] font-bold"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting…
            </span>
          ) : (
            "Generate"
          )}
        </Button>

        <RecentCreations />
      </div>
    </StudioLayout>
  );
}
