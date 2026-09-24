export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const filename = url.searchParams.get("filename") || "video.mp4";

  if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        redirect: "follow",
      });

      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Disposition, Content-Type",
      );
      headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
      const contentLength = upstream.headers.get("content-length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }
      const cleanName = encodeURIComponent(filename.replace(/["\r\n]/g, ""));
      headers.set("Content-Disposition", `attachment; filename="${cleanName}"`);

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch (streamErr) {
      console.error("[DownloadProxy] Error:", streamErr);
      return new Response("Failed to fetch stream", { status: 502 });
    }
  }
  return new Response("Missing target url", { status: 400 });
}
