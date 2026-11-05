import { useEffect, useRef, useState } from "react";
import { setPrefs, usePrefs } from "@/lib/astra/prefs";
import { openProxied } from "@/lib/astra/proxy";
import { attachProxiedPopups } from "@/lib/astra/proxy-popups";
import { Button } from "@/components/ui/button";
import { cloudRelayUrl, needsIsolation } from "@/lib/games/cloud-relay";
import { gameRelayUrl, useGameplayPerformance, type GameQuality } from "@/lib/games/performance";
import { PerfOverlay } from "@/components/games/PerfOverlay";
import { SocialShare } from "@/components/social/SocialAccess";

export function GamePlayView({url,name,guest=false}:{url:string;name:string;guest?:boolean}) {
  const [quality, setQuality] = useState<GameQuality>("performance");
  const tuned = gameRelayUrl(url, quality);
  // Big ports get the isolated same-domain relay so they can boot and download their data folders.
  const relayed = tuned ? null : cloudRelayUrl(url);
  // Isolated ports must be top-level pages; other relayed games stay in this tab's frame so their
  // sign-in popups go through the proxy.
  let isolated = !!tuned;
  try { isolated = isolated || (!!relayed && needsIsolation(new URL(url).hostname)); } catch { /* invalid url */ }
  const direct = tuned ?? (isolated ? relayed : null);
  const prefs = usePrefs();
  useGameplayPerformance();
  const ref = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Big games can run the browser out of memory. Never auto-start, so a restored/reloaded tab
  // doesn't instantly crash the browser again; remember if the last start didn't end cleanly.
  const crashKey = `astra:play-running:${url}`;
  const [started, setStarted] = useState(false);
  const [crashedBefore, setCrashedBefore] = useState(false);
  const [lowMemory, setLowMemory] = useState(false);
  const [showStats, setShowStats] = useState(prefs.perfOverlay);
  const toggleStats = () => setShowStats((v) => {
    setPrefs({ perfOverlay: !v });
    return !v;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && e.shiftKey && !(e.target instanceof HTMLInputElement)) toggleStats();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try { setCrashedBefore(localStorage.getItem(crashKey) === "1"); } catch { /* ignore */ }
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    setLowMemory(typeof mem === "number" && mem < 8);
  }, [crashKey]);

  useEffect(() => {
    if (!started) return;
    try { localStorage.setItem(crashKey, "1"); } catch { /* ignore */ }
    const clean = () => { try { localStorage.removeItem(crashKey); } catch { /* ignore */ } };
    window.addEventListener("pagehide", clean);
    return () => { window.removeEventListener("pagehide", clean); clean(); };
  }, [started, crashKey]);

  useEffect(() => {
    if (name) document.title = `${name} — BirchBlock`;
    if (started && direct) { window.location.href = direct; return; }
    const iframe = ref.current;
    if (!started || !iframe || !url) return;
    // Sign-in popups (e.g. "Sign in with Google") open in a proxied overlay instead of escaping the proxy.
    const detach = attachProxiedPopups(iframe, url, prefs);
    if (relayed) { iframe.src = relayed; return detach; }
    openProxied(iframe, url, prefs).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return detach;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, url, direct, relayed, prefs.transport, prefs.wisp]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {error && <p className="absolute left-0 right-0 top-0 z-10 bg-background px-4 py-2 text-sm text-destructive">Couldn't load: {error}</p>}
      {!url && <p className="p-6 text-sm text-muted-foreground">No game selected.</p>}
      {url && !started && (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
            <h1 className="text-xl font-semibold">{name || "Game"}</h1>
            {tuned && <label className="block space-y-2 text-sm">Graphics
              <select aria-label="Graphics quality" value={quality} onChange={(e) => setQuality(e.target.value as GameQuality)} className="block w-full rounded-md border border-input bg-background px-3 py-2">
                <option value="performance">Performance</option>
                <option value="balanced">Balanced</option>
                <option value="native">Original quality</option>
              </select>
            </label>}
            {crashedBefore && <p className="text-sm text-destructive">This game didn't close properly last time, which usually means the browser ran out of memory.</p>}
            {lowMemory && <p className="text-sm text-destructive">Your device reports less than 8 GB of memory, so this game will probably crash.</p>}
            <p className="text-sm text-muted-foreground">Before starting: close other tabs and apps.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showStats} onChange={toggleStats} />
              Show performance overlay (FPS, ping, memory) — press Shift+F while playing to toggle
            </label>
            <div className="flex gap-2">
              <Button onClick={() => setStarted(true)}>Start game</Button>
              <Button variant="outline" onClick={() => window.close()}>Close tab</Button>
              {!guest && <SocialShare title={name || "Game"} link={`/console/store?game=${encodeURIComponent(`cloud:${url}:${name}`)}`} />}
            </div>
          </div>
        </div>
      )}
      <iframe ref={ref} title={name || "Game"} className={started ? "h-full w-full border-0" : "hidden"} allow="fullscreen; autoplay; gamepad; microphone; clipboard-read; clipboard-write; keyboard-map; pointer-lock" allowFullScreen />
      <PerfOverlay frame={ref} visible={started && showStats} onClose={toggleStats} />
    </div>
  );
}
