import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/download-proxy") {
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

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
