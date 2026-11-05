import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { artUrl, next, prev, seek, setVolume, toggle, toggleRepeat, toggleShuffle, usePlayer } from "@/lib/music/player";
import { Button } from "@/components/ui/button";

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const bioCache = new Map<string, string>();

/** Qaisify-style full screen "now playing" view with artist bio from Wikipedia. */
export function FullscreenPlayer({ onClose, onMute, muted }: { onClose: () => void; onMute: () => void; muted: boolean }) {
  const p = usePlayer();
  const t = p.cur >= 0 ? p.queue[p.cur] : undefined;
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (!t?.artist) return;
    const hit = bioCache.get(t.artist);
    if (hit !== undefined) { setBio(hit); return; }
    setBio("");
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.artist)}`)
      .then(r => (r.ok ? r.json() : null)).then(d => { const x = d?.extract ?? ""; bioCache.set(t.artist, x); setBio(x); }).catch(() => {});
  }, [t?.artist]);
  if (!t) return null;
  const dur = p.dur || t.duration || 0;
  const upNext = p.queue.slice(p.cur + 1, p.cur + 6);
  return (
    <div className="fixed inset-0 z-[400] flex flex-col overflow-auto bg-background/95 backdrop-blur-xl" role="dialog" aria-label="Now playing">
      <div className="flex justify-end p-4"><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close full screen player"><ChevronDown /></Button></div>
      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-6 pb-10 md:grid-cols-2 md:items-center">
        <img src={artUrl(t.art)} alt="" className="aspect-square w-full max-w-md justify-self-center rounded-2xl object-cover shadow-2xl" />
        <div className="space-y-6">
          <div><h2 className="text-3xl font-bold">{t.title}</h2><p className="text-lg text-muted-foreground">{t.artist}{t.album ? ` · ${t.album}` : ""}</p></div>
          {dur > 0 && (
            <div className="space-y-1">
              <input type="range" min={0} max={dur} step={1} value={Math.min(p.time, dur)} onChange={e => seek(Number(e.target.value))} aria-label="Seek" className="music-range block w-full" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>{fmt(p.time)}</span><span>{fmt(dur)}</span></div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleShuffle} aria-pressed={p.shuffle} aria-label="Shuffle"><Shuffle /></Button>
            <Button variant="ghost" size="icon" onClick={prev} aria-label="Previous"><SkipBack /></Button>
            <Button size="lg" className="size-14 rounded-full" onClick={toggle} aria-label={p.paused ? "Play" : "Pause"}>{p.loading ? <Loader2 className="animate-spin" /> : p.paused ? <Play /> : <Pause />}</Button>
            <Button variant="ghost" size="icon" onClick={next} aria-label="Next"><SkipForward /></Button>
            <Button variant="ghost" size="icon" onClick={toggleRepeat} aria-pressed={p.repeat !== "off"} aria-label={`Repeat ${p.repeat}`}><Repeat />{p.repeat === "one" && <span>1</span>}</Button>
            <Button variant="ghost" size="icon" onClick={onMute} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</Button>
            <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" className="music-range w-24" />
          </div>
          {upNext.length > 0 && (
            <div><h3 className="mb-2 text-sm font-semibold text-muted-foreground">Up next</h3>
              <ul className="space-y-1 text-sm">{upNext.map((q, i) => <li key={q.id + i} className="truncate">{q.title} <span className="text-muted-foreground">· {q.artist}</span></li>)}</ul>
            </div>
          )}
          {bio && <div><h3 className="mb-2 text-sm font-semibold text-muted-foreground">About {t.artist}</h3><p className="line-clamp-6 text-sm text-muted-foreground">{bio}</p></div>}
          <p className="text-xs text-muted-foreground">Shortcuts: Space play/pause · Ctrl+←/→ skip · Shift+←/→ seek 10s · M mute · S shuffle · R repeat · F full screen · Esc close</p>
        </div>
      </div>
    </div>
  );
}
