import type { Prefs } from "./prefs";
import { createClientOnlyFn } from "@tanstack/react-start";
import { withRetroraCompatibility } from "@/lib/games/retrora-proxy";

export const DEFAULT_WISP = "wss://wisp.mercurywork.shop/";
export const WISP_FALLBACKS = [DEFAULT_WISP, "wss://anura.pro/", "wss://definitelyscience.com/wisp/"];

/** Resolve as soon as a server opens; close every probe, including slow losing sockets. */
export function firstReachableWisp(urls: readonly string[], ms = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const sockets: WebSocket[] = [];
    let settled = false;
    let failed = 0;
    const close = () => sockets.forEach((ws) => {
      ws.onopen = null; ws.onerror = null; ws.onclose = null;
      try { ws.close(); } catch { /* socket already closed */ }
    });
    const finish = (url?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); close();
      if (url) resolve(url); else reject(new Error("No Wisp server reachable from this network"));
    };
    const timer = setTimeout(() => finish(), ms);
    if (!urls.length) { finish(); return; }
    for (const url of urls) {
      let counted = false;
      const fail = () => { if (counted || settled) return; counted = true; if (++failed === urls.length) finish(); };
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);
        ws.onopen = () => finish(url);
        ws.onerror = fail;
        ws.onclose = fail;
      } catch { fail(); }
    }
  });
}

async function pickWisp(custom: string): Promise<string> {
  // Honor a user's explicit server before racing the automatic fallbacks.
  if (custom) {
    try { return await firstReachableWisp([custom]); } catch { /* automatic fallback */ }
  }
  return firstReachableWisp(WISP_FALLBACKS.filter((url) => url !== custom));
}

type Controller = import("@mercuryworkshop/scramjet-controller").Controller;
type Frame = import("@mercuryworkshop/scramjet-controller").Frame;

let cache: { key: string; promise: Promise<Controller> } | null = null;
let scriptsPromise: Promise<void> | null = null;
const frameInitializers = new WeakMap<HTMLIFrameElement, (win: Window) => void>();
const activeFrames = new WeakMap<HTMLIFrameElement, Frame>();

/** Reuse the game's routing context and cookie jar for a real OAuth window. */
export function gamePopupUrl(iframe: HTMLIFrameElement, target: string): string | null {
  const frame = activeFrames.get(iframe);
  return frame ? new URL(frame.prefix + frame.controller.config.codec.encode(target), window.location.origin).href : null;
}

/** Arcade frames have no controller; allocate a routing context without embedding OAuth. */
export async function preparePopupRouting(iframe: HTMLIFrameElement, prefs: Prefs): Promise<void> {
  if (activeFrames.has(iframe)) return;
  const controller = await getProxyController(prefs);
  if (!activeFrames.has(iframe)) activeFrames.set(iframe, controller.createFrame(iframe));
}

export function onProxyFrameInit(iframe: HTMLIFrameElement, callback: (win: Window) => void) {
  frameInitializers.set(iframe, callback);
  return () => { frameInitializers.delete(iframe); };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadProxyScripts(): Promise<void> {
  scriptsPromise ??= (async () => {
    await loadScript("/scramjet/scramjet.js");
    await loadScript("/scramjet/controller.api.js");
  })();
  return scriptsPromise;
}

function waitForActive(reg: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (reg.active) return Promise.resolve(reg.active);
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return Promise.reject(new Error("Proxy worker failed to start"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Proxy worker timed out")), 30000);
    sw.addEventListener("statechange", () => {
      if (sw.state === "activated") { clearTimeout(timer); resolve(sw); }
      if (sw.state === "redundant") { clearTimeout(timer); reject(new Error("Proxy worker was rejected")); }
    });
  });
}

const makeTransport = createClientOnlyFn(async (transport: Prefs["transport"], custom: string): Promise<any> => {
  if (transport !== "astra") {
    const wisp = await pickWisp(custom).catch(() => null);
    if (wisp) {
      try {
        const t = transport === "libcurl"
          ? new (await import("@mercuryworkshop/libcurl-transport")).default({ wisp })
          : new (await import("@mercuryworkshop/epoxy-transport")).default({ wisp });
        await t.init();
        return withRetroraCompatibility(t);
      } catch { /* fall through to the Astra relay */ }
    }
  }
  const { AstraRelayTransport } = await import("./relay-transport");
  const t = new AstraRelayTransport();
  await t.init();
  return withRetroraCompatibility(t);
});

async function buildController(transport: Prefs["transport"], custom: string): Promise<Controller> {
  await loadProxyScripts();
  const { Controller } = (globalThis as Record<string, any>)["$scramjetController"] as {
    Controller: new (init: any) => Controller;
  };

  const reg = await navigator.serviceWorker.register("/scramjet/sw.js?v=4", { scope: "/scramjet/p/", updateViaCache: "none" });
  // Pick up a freshly published proxy worker right away instead of on the next visit.
  await reg.update().catch(() => {});
  if (reg.installing || reg.waiting) await waitForActive({ active: null, installing: reg.installing, waiting: reg.waiting } as ServiceWorkerRegistration).catch(() => {});
  const [sw, t] = await Promise.all([waitForActive(reg), makeTransport(transport, custom)]);

  return new Controller({
    serviceworker: sw,
    transport: t,
    config: {
      prefix: "/scramjet/p/",
      scramjetPath: "/scramjet/scramjet.js",
      injectPath: "/scramjet/controller.inject.js",
      wasmPath: "/scramjet/scramjet.wasm",
    },
  });
}

export function getProxyController(prefs: Prefs): Promise<Controller> {
  const key = `${prefs.transport}|${prefs.wisp}`;
  if (!cache || cache.key !== key) {
    cache = { key, promise: buildController(prefs.transport, prefs.wisp.trim()) };
    cache.promise.catch(() => { if (cache?.key === key) cache = null; });
  }
  return cache.promise;
}

/** Long movies outlive the browser's idle-worker timeout; re-attach periodically so mid-stream segment fetches keep routing. */
export function keepProxyAlive(prefs: Prefs, ms = 15000): () => void {
  const timer = setInterval(() => {
    // Ping only: re-creating the message port mid-stream would orphan in-flight video/audio requests.
    void prefs; void navigator.serviceWorker?.getRegistration("/scramjet/p/").then((r) => r?.active?.postMessage?.({ type: "astra-keepalive" })).catch(() => {});
  }, ms);
  return () => clearInterval(timer);
}

export async function openProxied(iframe: HTMLIFrameElement, url: string, prefs: Prefs): Promise<Frame> {
  const controller = await getProxyController(prefs);
  // Re-attach to the proxy worker each time: the browser stops idle workers,
  // which wipes their routing table and makes proxied pages 404.
  const c = controller as any;
  c.guardServiceWorkerRevive = false;
  try { c.setupMessagePort?.(); } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 150));
  const frame = controller.createFrame(iframe);
  activeFrames.set(iframe, frame);
  // Run after Scramjet hooks, but before any page scripts can cache window.open.
  const runtime = (globalThis as Record<string, any>)["$scramjet"];
  runtime.Tap.tap(frame.hooks.init.post, ({ window: win }: { window: Window }) => {
    frameInitializers.get(iframe)?.(win);
  });
  frame.go(url);
  return frame;
}
