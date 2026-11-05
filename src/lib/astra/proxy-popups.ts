import type { Prefs } from "./prefs";
import { gamePopupUrl, onProxyFrameInit, openProxied, preparePopupRouting } from "./proxy";

const PREFIX = "/scramjet/p/";

/** Request an OAuth window without severing the callback connection to the game. */
export function signInWindowFeatures(requested = ""): string {
  const sizes = requested.split(",").map((value) => value.trim())
    .filter((value) => /^(width|height|left|top)=\d+$/i.test(value));
  if (!sizes.some((value) => /^width=/i.test(value))) sizes.push("width=520");
  if (!sizes.some((value) => /^height=/i.test(value))) sizes.push("height=720");
  return ["popup=yes", "resizable=yes", "scrollbars=yes", ...sizes].join(",");
}

/** Turn whatever a proxied page passed to window.open into a real target address. */
export function resolvePopupTarget(raw: string, base: string): string | null {
  const value = raw.trim();
  if (!value || value === "about:blank") return null;
  try {
    const u = new URL(value, base);
    // Relayed game pages live under the cloud relay; recover the game's real address.
    const relay = u.pathname.match(/^\/api\/public\/cg\/(https?)\/([^/]+)(\/.*)?$/);
    if (relay) return `${relay[1]}://${relay[2]}${relay[3] ?? "/"}${u.search}${u.hash}`;
    // Already-proxied addresses carry the real address after the proxy prefix.
    if (u.pathname.startsWith(PREFIX)) {
      const path = u.pathname.slice(PREFIX.length);
      // Controller prefixes include a frame ID before the encoded destination.
      const encoded = path.match(/(?:^|\/)(https?%3A.*)$/i)?.[1];
      if (!encoded) return null;
      const inner = decodeURIComponent(encoded) + u.search + u.hash;
      return /^https?:\/\//i.test(inner) ? inner : null;
    }
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Keep sign-in popups (Google, Discord, etc.) opened by a proxied page inside the proxy:
 * the popup becomes a separate proxied window (overlay fallback), and it can talk
 * back to the page that opened it.
 */
export function attachProxiedPopups(iframe: HTMLIFrameElement, baseUrl: string, prefs: Prefs) {
  let overlay: HTMLDivElement | null = null;
  let popup: Window | null = null;
  let detachPopup = () => {};
  let popupName = "";
  let generation = 0;
  let nativeHandle: Window | null = null;
  const bridgeHandles = new Map<string, Window>();
  const close = () => { detachPopup(); detachPopup = () => {}; popup?.close(); popup = null; overlay?.remove(); overlay = null; };
  const patch = (initializedWindow?: Window, callingWindow?: Window) => {
    type Win = Window & { open: typeof window.open };
    let w: Win | null = null;
    try { w = (initializedWindow ?? iframe.contentWindow) as Win | null; } catch { return; }
    if (!w) return;
    // Initialization also runs for nested game frames: the actual caller must be
    // the opener, not always the outer frame, or Firebase callbacks miss their SDK.
    const opener = callingWindow ?? w;
    try {
      w.open = ((u?: string | URL, name?: string, features?: string) => {
        let current = baseUrl;
        try { current = resolvePopupTarget(opener.location.href, baseUrl) ?? baseUrl; } catch { /* ignore */ }
        const target = resolvePopupTarget(String(u ?? ""), current);
        if (!target && String(u ?? "") && String(u) !== "about:blank") return null;
        const requestedName = name && !/^_(self|parent|top|blank)$/i.test(name) ? name : "astra-game-signin";
        if (popup && !popup.closed && popupName === requestedName && nativeHandle) {
          if (target) nativeHandle.location.href = target;
          popup.focus();
          return nativeHandle;
        }
        close();
        const attempt = ++generation;
        popupName = requestedName;
        // Open synchronously while user activation is still available.
        popup = window.open("about:blank", requestedName, signInWindowFeatures(features));
        // Firebase polls the returned window's closed state and uses its top-level
        // opener/postMessage. An iframe masquerading as a popup breaks that contract.
        if (popup) {
          const nativePopup = popup;
          nativePopup.opener = opener;
          let destination = "about:blank";
          const navigate = (raw: string | URL) => {
            const next = resolvePopupTarget(String(raw), current);
            if (!next) return;
            destination = next;
            const proxied = gamePopupUrl(iframe, next);
            if (proxied) nativePopup.location.href = proxied;
            else void preparePopupRouting(iframe, prefs).then(() => {
              if (attempt !== generation || nativePopup.closed || destination !== next) return;
              const ready = gamePopupUrl(iframe, next);
              if (!ready) throw new Error("Sign-in routing is unavailable.");
              nativePopup.location.href = ready;
            }).catch(error => {
              try { nativePopup.document.body.textContent = `Sign-in couldn't load: ${error instanceof Error ? error.message : "Connection failed"}. Close this window and try again.`; } catch { /* closed */ }
            });
          };
          if (target) navigate(target);
          const locationHandle = {
            get href() { return destination; },
            set href(value: string) { navigate(value); },
            assign: navigate, replace: navigate,
          };
          nativeHandle = new Proxy(nativePopup, {
            get(win, key) {
              if (key === "location") return locationHandle;
              const value = Reflect.get(win, key, win);
              return typeof value === "function" ? value.bind(win) : value;
            },
            set(win, key, value) {
              if (key === "location") { navigate(value); return true; }
              return Reflect.set(win, key, value, win);
            },
          });
          return nativeHandle;
        }
        const owner = document;
        overlay = document.createElement("div");
        overlay.className = "proxy-popup";
        const box = document.createElement("div");
        box.className = "proxy-popup-box";
        const bar = document.createElement("div");
        bar.className = "proxy-popup-bar";
        bar.textContent = "Sign in";
        const x = document.createElement("button");
        x.type = "button"; x.textContent = "Close"; x.onclick = close;
        bar.appendChild(x);
        const frame = owner.createElement("iframe");
        frame.title = "Game sign-in";
        frame.className = "proxy-popup-frame";
        frame.allow = "fullscreen; autoplay; clipboard-read; clipboard-write";
        box.append(bar, frame);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        const wireUp = () => {
          try {
            const pw = frame.contentWindow;
            if (!pw) return;
            Object.defineProperty(pw, "opener", { value: opener, configurable: true });
            pw.close = close;
          } catch { /* ignore */ }
        };
        wireUp();
        frame.addEventListener("load", wireUp);
        detachPopup = onProxyFrameInit(frame, wireUp);
        const navigate = (raw: string | URL) => {
          const next = resolvePopupTarget(String(raw), current);
          if (!next) return;
          void openProxied(frame, next, prefs).catch((error) => {
          const message = owner.createElement("p");
          message.textContent = `Sign-in couldn't load: ${error instanceof Error ? error.message : "Connection failed"}`;
          owner.body.appendChild(message);
          });
        };
        if (target) navigate(target);
        const handle = frame.contentWindow;
        if (!handle) return null;
        // Firebase first opens about:blank, then asynchronously assigns its auth
        // helper URL. The arcade/blocked-popup fallback must support that too.
        const locationHandle = {
          get href() { try { return frame.contentWindow?.location.href ?? "about:blank"; } catch { return ""; } },
          set href(value: string) { navigate(value); },
          assign: navigate, replace: navigate,
        };
        return new Proxy(handle, {
          get(win, key) {
            if (key === "location") return locationHandle;
            if (key === "opener") return opener;
            if (key === "closed") return !frame.isConnected;
            if (key === "close") return close;
            const value = Reflect.get(win, key, win);
            return typeof value === "function" ? value.bind(win) : value;
          },
          set(win, key, value) {
            if (key === "location") { navigate(value); return true; }
            return Reflect.set(win, key, value, win);
          },
        });
      }) as typeof window.open;
      w.document.addEventListener("click", (event) => {
        const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
        if (!link) return;
        const target = resolvePopupTarget(link.href, baseUrl);
        const isLogin = target && /^(accounts\.google\.com|accounts\.youtube\.com|discord\.com|login\.microsoftonline\.com)$/.test(new URL(target).hostname);
        if (link.target && link.target !== "_self" || isLogin) {
          event.preventDefault(); event.stopImmediatePropagation(); w?.open(link.href, "_blank");
        }
      }, true);
    } catch { /* page blocked patching */ }
  };
  const onLoad = () => patch();
  const detachInit = onProxyFrameInit(iframe, patch);
  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.data?.bbPopup !== 1 || typeof event.data.url !== "string") return;
    // Sandboxed arcade games cannot expose their window to the parent. Use the same popup path.
    const target = resolvePopupTarget(event.data.url, baseUrl);
    const id = typeof event.data.id === "string" ? event.data.id : "legacy";
    if (event.data.action === "navigate") {
      const handle = bridgeHandles.get(id);
      if (handle && target) handle.location.href = target;
      return;
    }
    if (event.data.action === "close") { bridgeHandles.get(id)?.close(); bridgeHandles.delete(id); return; }
    if (target || event.data.url === "about:blank" || event.data.url === "") {
      const bridge = document.createElement("iframe");
      bridge.hidden = true; document.body.appendChild(bridge);
      patch(bridge.contentWindow ?? undefined, event.source as Window);
      const handle = bridge.contentWindow?.open(target ?? "about:blank", typeof event.data.name === "string" ? event.data.name : "_blank");
      if (handle) bridgeHandles.set(id, handle);
      bridge.remove();
    }
  };
  iframe.addEventListener("load", onLoad);
  window.addEventListener("message", onMessage);
  return () => { detachInit(); iframe.removeEventListener("load", onLoad); window.removeEventListener("message", onMessage); close(); };
}
