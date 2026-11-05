import { AAA_GAMES } from "./aaa";
import { CLOUD_GAMES } from "./cloud-catalog";

/**
 * Same-domain relay for every cloud game (same approach as the GTA V relay): the site is served from
 * Astra's own domain with its root-relative files, fetches and redirects kept inside the relay. Big
 * ports from the AAA list additionally get cross-origin isolation (SharedArrayBuffer). Only hosts from
 * the fixed catalog are relayed, so this never becomes an open proxy.
 */
export const CLOUD_RELAY_PREFIX = "/api/public/cg";

/** GTA V keeps its own tuned relay. */
const OWN_RELAY = ["fiveplay.lol", "www.fiveplay.lol", "gta.deloskiyt.pl"];
/** Account-based streaming services need their multi-site sign-in, which only the full proxy carries. */
const ACCOUNT_SERVICES = ["www.xbox.com", "xbox.com", "play.geforcenow.com", "now.gg", "cloud.boosteroid.com", "luna.amazon.com"];
// Retrora derives account redirects and online match sockets from its original hostname.
// Use the complete-site proxy's virtual origin, cookies and WebSocket transport, not a path relay.
const VIRTUAL_ORIGIN_GAMES = ["retrora.lol", "www.retrora.lol", "retrora.org", "api.retrora.org"];

// Verified BuildNow GG dependencies: the portal and actual Unity game are on different hosts.
const GAME_ASSET_HOSTS = ["games.crazygames.com", "builds.crazygames.com", "buildnow-gg.game-files.crazygames.com", "files.crazygames.com", "videos.crazygames.com", "sdk.crazygames.com", "images.crazygames.com", "model.crazygames.com", "cdn.cyberpunk2077.lol", "cp2077-port.fn-web-worker.workers.dev"];

// Keep catalog URLs/installed IDs stable, but play the provider's current game-only frame.
// The portal mixes outdated cached builds, consent UI and recommendations into gameplay.
const GAME_ENTRIES: Record<string, string> = {
  "https://www.crazygames.com/game/buildnow-gg": "https://games.crazygames.com/en_US/buildnow-gg/index.html",
};

const hostOf = (url: string) => { try { return [new URL(url).hostname.toLowerCase()]; } catch { return []; } };
const withWww = (h: string) => (h.startsWith("www.") ? [h, h.slice(4)] : [h, `www.${h}`]);

const RELAY_HOSTS = new Set(
  [...GAME_ASSET_HOSTS, ...CLOUD_GAMES.flatMap((g) => hostOf(g.url)).flatMap(withWww)]
    .filter((h) => !OWN_RELAY.includes(h) && !ACCOUNT_SERVICES.includes(h) && !VIRTUAL_ORIGIN_GAMES.includes(h)),
);
const ISOLATED_HOSTS = new Set([...AAA_GAMES.flatMap((g) => hostOf(g.url)).flatMap(withWww), "cdn.cyberpunk2077.lol", "cp2077-port.fn-web-worker.workers.dev"]);

export const isRelayHost = (host: string) => RELAY_HOSTS.has(host.toLowerCase());
/** Big ports need SharedArrayBuffer; regular games stay non-isolated so sign-in popups and embeds work. */
export const needsIsolation = (host: string) => ISOLATED_HOSTS.has(host.toLowerCase());

/** `/api/public/cg/<scheme>/<host>/<path>` for a catalog game, otherwise null. */
export function cloudRelayUrl(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const entry = GAME_ENTRIES[`${u.origin}${u.pathname.replace(/\/$/, "")}`];
  if (entry) { const next = new URL(entry); next.search = u.search; next.hash = u.hash; u = next; }
  if (!/^https?:$/.test(u.protocol) || !isRelayHost(u.hostname)) return null;
  return `${CLOUD_RELAY_PREFIX}/${u.protocol.slice(0, -1)}/${u.host}${u.pathname}${u.search}${u.hash}`;
}

/** Parses a relay path back into the upstream URL; null for anything outside the catalog. */
export function upstreamFromRelay(pathname: string, search: string): URL | null {
  const m = new RegExp(`^${CLOUD_RELAY_PREFIX}/(https?)/([^/]+)(/.*)?$`).exec(pathname);
  if (!m) return null;
  const [, scheme, host, rest = "/"] = m;
  if (rest.split("/").some((s) => s === ".." || s === ".")) return null;
  let u: URL;
  try { u = new URL(`${scheme}://${host}${rest}${search}`); } catch { return null; }
  return isRelayHost(u.hostname) ? u : null;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Points root-relative and absolute same-site URLs in text at the relay. */
export function rewriteRelayText(text: string, base: string, kind: "html" | "css" | "js", host: string): string {
  const abs = new RegExp(`(?:https?:)?//${esc(host)}(?=[/"'\`?#)\\s]|$)`, "gi");
  let out = text.replace(abs, base);
  for (const assetHost of GAME_ASSET_HOSTS) {
    if (assetHost === host) continue;
    const origin = /^https?:\/\//.test(base) ? new URL(base).origin : "";
    out = out.replace(new RegExp(`(?:https?:)?//${esc(assetHost)}(?=[/"'\`?#)\\s]|$)`, "gi"), `${origin}${CLOUD_RELAY_PREFIX}/https/${assetHost}`);
  }
  if (kind === "html") {
    // Rewritten JS/CSS no longer matches the upstream integrity hash.
    out = out.replace(/\s(?:integrity|nonce)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
    out = out.replace(/(\s(?:src|href|action|poster|data)\s*=\s*["'])\/(?!\/|api\/public\/cg\/)/gi, `$1${base}/`);
    out = out.replace(/(\simagesrcset|\ssrcset)(\s*=\s*["'])([^"']*)/gi, (_m, a: string, q: string, v: string) => a + q + v.replace(/(^|,\s*)\/(?!\/|api\/public\/cg\/)/g, `$1${base}/`));
  }
  // Inline scripts also contain new URL('/...'): preserve the constructor's case.
  if (kind === "html" || kind === "css") out = out.replace(/(new\s+)?(url\(\s*["']?)\/(?!\/|api\/public\/cg\/)/gi, (match, constructor: string | undefined, prefix: string) => constructor ? match : `${prefix}${base}/`);
  return out;
}

/** Rewrites a Set-Cookie header so the game's login/session cookies live under its relay path. */
export function rewriteSetCookie(cookie: string, base: string): string {
  const parts = cookie.split(";").map((p) => p.trim()).filter((p) => p && !/^(domain|path|samesite)=/i.test(p) && !/^partitioned$/i.test(p));
  return [...parts, `Path=${base}/`, "SameSite=Lax"].join("; ");
}

/**
 * Runtime shim: keeps fetch/XHR/Worker/WebSocket calls the game builds at runtime (root-relative,
 * same-origin or the game's own host) inside the relay.
 */
export function relayShim(base: string, host: string): string {
  return `<script>(function(){var B=${JSON.stringify(base)},H=${JSON.stringify(host)},A=${JSON.stringify(GAME_ASSET_HOSTS)},P="/api/public/cg/";function r(u){if(u instanceof URL)u=u.href;if(typeof u!=="string")return u;if(u.charAt(0)==="/"&&u.charAt(1)!=="/"){return u.indexOf(P)===0?u:B+u}try{var x=new URL(u,location.href);if(x.pathname.indexOf(P)===0)return u;if(A.indexOf(x.hostname)!==-1&&/^https?:$/.test(x.protocol))return P+x.protocol.slice(0,-1)+"/"+x.host+x.pathname+x.search+x.hash;if(x.host===location.host||x.host===H||x.host==="www."+H||"www."+x.host===H){if(/^https?:$/.test(x.protocol))return B+x.pathname+x.search+x.hash}}catch(e){}return u}
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(/^(src|href|action|poster|data)$/i.test(n))v=r(v);return sa.call(this,n,v)};
[["HTMLIFrameElement","src"],["HTMLScriptElement","src"],["HTMLLinkElement","href"],["HTMLImageElement","src"],["HTMLMediaElement","src"],["HTMLSourceElement","src"]].forEach(function(t){var C=window[t[0]];if(!C)return;var d=Object.getOwnPropertyDescriptor(C.prototype,t[1]);if(d&&d.set)Object.defineProperty(C.prototype,t[1],Object.assign({},d,{set:function(v){d.set.call(this,r(v))}}))});
var f=window.fetch;if(f)window.fetch=function(i,o){try{if(typeof i==="string"||i instanceof URL)i=r(i);else if(i&&i.url){var n=r(i.url);if(n!==i.url)i=new Request(n,i)}}catch(e){}return f.call(this,i,o)};
var x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(){try{arguments[1]=r(String(arguments[1]))}catch(e){}return x.apply(this,arguments)};
["Worker","SharedWorker"].forEach(function(n){var W=window[n];if(!W)return;var N=function(u,o){return new W(r(String(u)),o)};N.prototype=W.prototype;window[n]=N});
var S=window.WebSocket;if(S){var Q=function(u,p){try{var x=new URL(String(u),location.href);if(x.host===location.host&&x.pathname.indexOf(P)!==0){x.host=H;u=x.href}}catch(e){}return p===undefined?new S(u):new S(u,p)};Q.prototype=S.prototype;["CONNECTING","OPEN","CLOSING","CLOSED"].forEach(function(k){Q[k]=S[k]});window.WebSocket=Q}})();</script>`;
}
