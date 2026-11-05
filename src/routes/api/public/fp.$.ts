import { createFileRoute } from "@tanstack/react-router";

/**
 * Direct relay for the GTA V browser port (fiveplay.lol). The port streams ~21 GB of data with many
 * parallel Range requests and needs cross-origin isolation (SharedArrayBuffer), which the in-page
 * proxy handles far too slowly. This relays the site verbatim from Astra's own domain instead, as a
 * top-level page. Public on purpose: it only relays one fixed public site, no user data.
 */
const PREFIX = "/api/public/fp";
const UPSTREAM = "https://fiveplay.lol";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const PASS = ["content-type", "content-range", "accept-ranges", "x-run-lengths", "cache-control", "etag", "last-modified"];
const ISOLATION = {
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "credentialless",
  "cross-origin-resource-policy": "cross-origin",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
  "access-control-allow-headers": "Range, Content-Type",
  "access-control-expose-headers": "Content-Range, Content-Length, Accept-Ranges, X-Run-Lengths",
};

/** Points the site's root-relative URLs (build folder, data folder, log) at this relay. */
export function rewriteFiveplay(text: string, html: boolean): string {
  let out = text.replace(/(['"`])\/(b\/[0-9a-f]|data\/(?=['"`]|manifest\.json)|log(?=['"`])|shot\?)/g, (_m, q: string, p: string) => `${q}${PREFIX}/${p}`);
  if (html) out = out.replace(/<script\b[^>]*>[^<]*<\/script>/gi, (tag) => (/quge5\.com|alwingulla\.com/i.test(tag) ? "" : tag)); // ad scripts
  return out;
}

async function relay(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ISOLATION });
  const path = url.pathname.slice(PREFIX.length) || "/";
  if (path.split("/").some((s) => s === ".." || s === ".")) return new Response("Not found", { status: 404, headers: ISOLATION });
  // The data loader POSTs batched block lists to /data/batch; other POSTs (logs) and screenshots are diagnostics.
  const isBatch = request.method === "POST" && path.startsWith("/data/batch");
  if ((request.method === "POST" && !isBatch) || path.startsWith("/shot")) return new Response(null, { status: 204, headers: ISOLATION });

  const fwd: Record<string, string> = { "user-agent": UA };
  for (const h of ["range", "if-none-match", "if-modified-since", "content-type"]) { const v = request.headers.get(h); if (v) fwd[h] = v; }
  let upstream: Response;
  try {
    const method = isBatch ? "POST" : request.method === "HEAD" ? "HEAD" : "GET";
    upstream = await fetch(`${UPSTREAM}${path}${url.search}`, { method, headers: fwd, body: isBatch ? await request.arrayBuffer() : null, redirect: "follow" });
  } catch {
    return new Response("Game server unreachable", { status: 502, headers: ISOLATION });
  }

  const headers = new Headers(ISOLATION);
  for (const h of PASS) { const v = upstream.headers.get(h); if (v) headers.set(h, v); }
  const type = (upstream.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = type.includes("text/html");
  const isJs = type.includes("javascript");
  if ((isHtml || isJs) && request.method !== "HEAD" && upstream.status === 200) {
    const body = rewriteFiveplay(await upstream.text(), isHtml);
    if (isHtml) headers.set("cache-control", "no-store");
    return new Response(body, { status: 200, headers });
  }
  const len = upstream.headers.get("content-length");
  if (len && !upstream.headers.get("content-encoding")) headers.set("content-length", len);
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

export const Route = createFileRoute("/api/public/fp/$")({
  server: {
    handlers: {
      GET: ({ request }) => relay(request),
      HEAD: ({ request }) => relay(request),
      POST: ({ request }) => relay(request),
      OPTIONS: ({ request }) => relay(request),
    },
  },
});
