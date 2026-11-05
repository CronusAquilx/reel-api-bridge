import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, ListMusic, Loader2, Maximize2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, X, Music2, EyeOff } from "lucide-react";
import { artUrl, downloadUrl, getPlayer, next, prev, seek, setPlayerPrefs, setVolume, stop, toggle, toggleRepeat, toggleShuffle, usePlayer } from "@/lib/music/player";
import { Button } from "@/components/ui/button";
import { setPrefs, usePrefs } from "@/lib/astra/prefs";
import { cn } from "@/lib/utils";
import { FullscreenPlayer } from "./FullscreenPlayer";

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

/** Mini player shown on every page so music keeps going while you browse. */
export function NowPlayingBar() {
  const p = usePlayer();
  const prefs = usePrefs();
  const [full, setFull] = useState(false);
  const lastVol = useRef(1);
  useEffect(() => { setPlayerPrefs(prefs); }, [prefs]);
  const t = p.cur >= 0 ? p.queue[p.cur] : undefined;
  const muted = p.volume === 0;
  const toggleMute = () => { const v = getPlayer().volume; if (v > 0) { lastVol.current = v; setVolume(0); } else setVolume(lastVol.current || 1); };
  useEffect(() => {
    if (!t) return;
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || e.altKey || e.metaKey) return;
      const s = getPlayer();
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.ctrlKey && e.shiftKey && e.key === "ArrowRight") { e.preventDefault(); seek(s.time + 10); }
      else if (e.ctrlKey && e.shiftKey && e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, s.time - 10)); }
      else if (e.ctrlKey && e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.ctrlKey && e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.shiftKey && e.key === "ArrowRight") { e.preventDefault(); seek(s.time + 10); }
      else if (e.shiftKey && e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, s.time - 10)); }
      else if (e.ctrlKey) return;
      else if (e.key === "m" || e.key === "M") toggleMute();
      else if (e.key === "s" || e.key === "S") toggleShuffle();
      else if (e.key === "r" || e.key === "R") toggleRepeat();
      else if (e.key === "f" || e.key === "F") setFull(v => !v);
      else if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [!!t]);
  if (prefs.musicBarHidden) return <><Button variant="secondary" size="icon" className="fixed bottom-16 right-3 z-[320] shadow-md" aria-label="Show music bar" title="Show music bar" onClick={() => setPrefs({ musicBarHidden: false })}><Music2 className="size-4"/></Button>{full && t && <FullscreenPlayer onClose={() => setFull(false)} onMute={toggleMute} muted={muted}/>}</>;
  const hideBar = <Button variant="ghost" size="icon" aria-label="Hide music bar" title="Hide music bar" onClick={() => setPrefs({ musicBarHidden: true })}><EyeOff className="size-4"/></Button>;
  if (!t) return <div className="now-playing qaisify-playerbar shrink-0 border-t"><div className="flex items-center justify-between gap-2 px-3 py-2"><div className="flex min-w-0 items-center gap-3"><Music2 className="size-8 shrink-0 text-primary"/><span className="truncate text-sm text-muted-foreground">Nothing playing</span></div><div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" disabled aria-label="Previous"><SkipBack className="size-4"/></Button><Button size="icon" disabled aria-label="Play"><Play className="size-4"/></Button><Button variant="ghost" size="icon" disabled aria-label="Next"><SkipForward className="size-4"/></Button><Link to="/music" aria-label="Open music"><ListMusic className="size-4"/></Link>{hideBar}</div></div></div>;
  const dur = p.dur || t.duration || 0;
  return (
    <div className="now-playing qaisify-playerbar shrink-0 border-t">
      {p.mode && dur > 0 && (
        <input type="range" min={0} max={dur} step={1} value={Math.min(p.time, dur)} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" className="music-range block w-full" />
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
        {t.art && <img src={artUrl(t.art)} alt="" className={cn("size-11 rounded-md object-cover shadow", !p.paused && "music-spin-slow")} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{t.title}</div>
          <div className="truncate text-xs text-muted-foreground">{p.status || t.artist}{p.mode === "audio" && dur ? ` · ${fmt(p.time)} / ${fmt(dur)}` : ""}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleShuffle} className="hidden sm:flex" aria-label="Shuffle" title="Shuffle" aria-pressed={p.shuffle}><Shuffle className="size-4"/></Button>
        <Button variant="ghost" size="icon" onClick={prev} aria-label="Previous"><SkipBack className="size-4" /></Button>
        <Button size="icon" onClick={toggle} aria-label={p.paused ? "Play" : "Pause"}>{p.loading ? <Loader2 className="size-4 animate-spin"/> : p.paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button>
        <Button variant="ghost" size="icon" onClick={next} aria-label="Next"><SkipForward className="size-4" /></Button>
        <Button variant="ghost" size="icon" onClick={toggleRepeat} className="hidden sm:flex" aria-label={`Repeat ${p.repeat}`} title={`Repeat ${p.repeat}`} aria-pressed={p.repeat !== "off"}><Repeat className="size-4"/>{p.repeat === "one" && <span>1</span>}</Button>
        {p.mode && (
          <label className="hidden items-center gap-1 sm:flex"><Volume2 className="size-4 text-muted-foreground" />
            <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" className="music-range w-20" />
          </label>
        )}
        <a href={downloadUrl(t)} download className="hidden rounded-md p-2 hover:bg-accent sm:block" aria-label="Download song"><Download className="size-4" /></a>
        <Button variant="ghost" size="icon" onClick={() => setFull(true)} aria-label="Full screen player" title="Full screen (F)"><Maximize2 className="size-4" /></Button>
        <Link to="/music" className="hidden rounded-md p-2 hover:bg-accent sm:block" aria-label="Open music"><ListMusic className="size-4" /></Link>
        <Button variant="ghost" size="icon" onClick={stop} aria-label="Stop"><X className="size-4" /></Button>
        {hideBar}
      </div>
      {full && <FullscreenPlayer onClose={() => setFull(false)} onMute={toggleMute} muted={muted} />}
    </div>
  );
}
