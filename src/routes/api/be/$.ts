import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin reverse proxy to the CineView Nest API.
 *
 * The browser only ever talks to `/api/be/...` on this origin, so the upstream
 * API's CORS configuration becomes irrelevant. Everything (method, query
 * string, body, Authorization bearer) is forwarded verbatim.
 */
const UPSTREAM = "https://cineview-api.priyanshusharma015.in";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

async function forward({ request, params }: { request: Request; params: { _splat?: string } }) {
  const path = params._splat ?? "";
  const search = new URL(request.url).search;
  const target = `${UPSTREAM}/${path}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("accept", request.headers.get("accept") ?? "application/json");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    const init: RequestInit = { method: request.method, headers, redirect: "follow" };
    if (hasBody) init.body = await request.arrayBuffer();
    upstream = await fetch(target, init);
  } catch (error) {
    console.error("[api-proxy] upstream unreachable", target, error);
    return Response.json(
      { code: "upstream_unreachable", message: "The CineView API could not be reached." },
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k) || k.startsWith("access-control-")) return;
    out.set(key, value);
  });

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const Route = createFileRoute("/api/be/$")({
  server: {
    handlers: {
      GET: forward,
      POST: forward,
      PUT: forward,
      PATCH: forward,
      DELETE: forward,
    },
  },
});
