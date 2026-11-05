import { useState } from "react";
import { Palette, Volume2, Timer, Database, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPrefs, usePrefs } from "@/lib/astra/prefs";
import { clearMusicHistory, SERVERS, setPlaybackSpeed, setServer, setSleepTimer, usePlayer, type Server } from "@/lib/music/player";

export const MUSIC_THEMES = ["midnight-void", "aurora", "solar-flare", "arctic", "forest-rave", "rose-gold", "cyber-punk", "obsidian"];
export function MusicSettings({ onRefresh }: { onRefresh: () => void }) {
  const [section, setSection] = useState("appearance");
  const prefs = usePrefs();
  const p = usePlayer();
  const sections = [{ id: "appearance", label: "Appearance", icon: Palette }, { id: "audio", label: "Audio & Playback", icon: Volume2 }, { id: "sleep", label: "Sleep Timer", icon: Timer }, { id: "cache", label: "Storage & Cache", icon: Database }, { id: "about", label: "About Qaisify", icon: Info }];
  return <section className="qaisify-settings"><h1 className="text-3xl font-semibold">Settings</h1><div className="mt-6 flex flex-col gap-6 md:flex-row"><nav className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col" aria-label="Music settings">{sections.map(s => <Button key={s.id} variant={section === s.id ? "secondary" : "ghost"} className="justify-start whitespace-nowrap" onClick={() => setSection(s.id)}><s.icon className="size-4"/>{s.label}</Button>)}</nav><div className="min-w-0 flex-1 space-y-6">
    {section === "appearance" && <><h2 className="text-lg">Theme</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{MUSIC_THEMES.map(id => <Button key={id} variant="outline" className="h-auto flex-col items-start gap-3 p-3" aria-pressed={prefs.musicTheme === id} onClick={() => setPrefs({ musicTheme: id })}><span className="qaisify-theme-swatch" data-music-theme={id}/><span className="capitalize">{id.replaceAll("-", " ")}</span></Button>)}</div></>}
    {section === "audio" && <><h2 className="text-lg">Playback source</h2><select className="w-full rounded-md border bg-card p-2" aria-label="Playback source" value={p.server} onChange={e => setServer(e.target.value as Server)}>{SERVERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><h2 className="text-lg">Playback speed</h2><div className="flex flex-wrap gap-2">{[.5,.75,1,1.25,1.5,2].map(speed => <Button key={speed} variant={p.speed === speed ? "default" : "outline"} onClick={() => setPlaybackSpeed(speed)}>{speed}×</Button>)}</div></>}
    {section === "sleep" && <><h2 className="text-lg">Sleep timer</h2>{p.sleepUntil ? <><p className="text-3xl">{Math.max(0,Math.ceil((p.sleepUntil-Date.now())/60_000))} min</p><Button variant="outline" onClick={() => setSleepTimer(null)}>Cancel timer</Button></> : <div className="flex flex-wrap gap-2">{[5,10,15,30,45,60].map(m => <Button key={m} variant="outline" onClick={() => setSleepTimer(m)}>{m} min</Button>)}</div>}</>}
    {section === "cache" && <><h2 className="text-lg">Storage & cache</h2><Button variant="outline" onClick={onRefresh}>Refresh music catalog</Button><Button variant="outline" onClick={clearMusicHistory}>Clear listening history</Button></>}
    {section === "about" && <><h2 className="text-2xl">Qaisify</h2><p className="text-muted-foreground">Version 1.0.0</p></>}
  </div></div></section>;
}