import { useEffect, useRef, useState, type RefObject } from "react";
import { X } from "lucide-react";
import { formatBytes, fpsRating, frameStats, pingAvg, type FrameStats } from "@/lib/games/perf-monitor";

type Snapshot = { host: FrameStats; game: FrameStats | null; ping: number | null; mem: number | null };

const CORNERS = [
  "left-2 top-2",
  "right-2 top-2",
  "bottom-2 right-2",
  "bottom-2 left-2",
] as const;

const EMPTY: FrameStats = { fps: 0, avgMs: 0, lowMs: 0 };

/**
 * In-game performance overlay: fps (host page and, for same-origin relayed games, the game
 * frame itself), 1% low frame time, ping to the relay, and JS heap usage. Click to move it
 * to another corner; Shift+F toggles it from the player screens.
 */
export function PerfOverlay({ frame, visible, onClose }: { frame: RefObject<HTMLIFrameElement | null>; visible: boolean; onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot>({ host: EMPTY, game: null, ping: null, mem: null });
  const [corner, setCorner] = useState(1);
  const hostDeltas = useRef<number[]>([]);
  const gameDeltas = useRef<number[]>([]);
  const pings = useRef<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    hostDeltas.current = [];
    gameDeltas.current = [];
    pings.current = [];

    let last = performance.now();
    const loop = (t: number) => {
      if (!live) return;
      const d = t - last;
      last = t;
      if (d > 0 && d < 1000) {
        hostDeltas.current.push(d);
        if (hostDeltas.current.length > 240) hostDeltas.current.shift();
      }
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);

    // Same-origin relayed games let us measure the game's own frame rate; cross-origin
    // proxied frames throw, and we just show the host fps instead.
    let gameLive = true;
    const tryGame = () => {
      try {
        const win = frame.current?.contentWindow;
        if (!win || win.location.origin !== window.location.origin) return false;
        let gLast = win.performance.now();
        const gLoop = (t: number) => {
          if (!gameLive) return;
          const d = t - gLast;
          gLast = t;
          if (d > 0 && d < 1000) {
            gameDeltas.current.push(d);
            if (gameDeltas.current.length > 240) gameDeltas.current.shift();
          }
          win.requestAnimationFrame(gLoop);
        };
        win.requestAnimationFrame(gLoop);
        return true;
      } catch {
        return false;
      }
    };
    const gameTry = setInterval(() => {
      if (tryGame()) clearInterval(gameTry);
    }, 2000);
    tryGame();

    const ping = async () => {
      const t0 = performance.now();
      try {
        await fetch("/favicon.ico", { cache: "no-store" });
        if (!live) return;
        pings.current.push(performance.now() - t0);
        if (pings.current.length > 12) pings.current.shift();
      } catch {
        /* offline — keep last reading */
      }
    };
    void ping();
    const pingId = setInterval(() => void ping(), 4000);

    const snapId = setInterval(() => {
      if (!live) return;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      setSnap({
        host: frameStats(hostDeltas.current),
        game: gameDeltas.current.length ? frameStats(gameDeltas.current) : null,
        ping: pingAvg(pings.current),
        mem: mem ? mem.usedJSHeapSize : null,
      });
    }, 500);

    return () => {
      live = false;
      gameLive = false;
      cancelAnimationFrame(raf);
      clearInterval(gameTry);
      clearInterval(pingId);
      clearInterval(snapId);
    };
  }, [visible, frame]);

  if (!visible) return null;

  const shown = snap.game ?? snap.host;
  const rating = fpsRating(shown.fps);
  const fpsColor = rating === "good" ? "text-foreground" : rating === "ok" ? "text-accent-foreground" : "text-destructive";

  return (
    <div
      role="status"
      aria-label="Performance overlay"
      className={`absolute ${CORNERS[corner]} z-40 select-none rounded-md border border-border bg-background/80 px-2.5 py-1.5 font-mono text-[11px] leading-tight text-muted-foreground shadow-lg backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCorner((c) => (c + 1) % CORNERS.length)}
          className={`text-base font-semibold tabular-nums ${fpsColor}`}
          aria-label="Move overlay to another corner"
          title="Click to move"
        >
          {Math.round(shown.fps)} FPS
        </button>
        <button type="button" onClick={onClose} aria-label="Hide performance overlay" className="rounded p-0.5 hover:bg-muted">
          <X className="size-3" />
        </button>
      </div>
      <div className="tabular-nums">
        {snap.game ? "game" : "page"} · avg {shown.avgMs.toFixed(1)} ms · 1% low {shown.lowMs.toFixed(0)} ms
      </div>
      <div className="tabular-nums">
        ping {snap.ping === null ? "—" : `${Math.round(snap.ping)} ms`}
        {snap.mem !== null && ` · mem ${formatBytes(snap.mem)}`}
      </div>
    </div>
  );
}
