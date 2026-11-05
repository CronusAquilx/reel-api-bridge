import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { GripHorizontal, Plus, Settings2, RotateCcw } from "lucide-react";
import { CloudSun, MapPin, Music, Pause, Play, SkipBack, SkipForward, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { getAppearance, setAppearance, usePrefs } from "@/lib/astra/prefs";
import { activeLayout } from "@/lib/astra/appearance";
import { notesKey, weatherLabel } from "@/lib/astra/desktop-widgets";
import { artUrl, next, prev, seek, toggle, usePlayer } from "@/lib/music/player";
import { WIDGET_NAMES, newWidget, widgetBounds, type DesktopWidget, type WidgetKind } from "@/lib/astra/widget-layout";
import { ExtraWidget } from "./ExtraWidgets";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Weather = { city: string; temperature: number; code: number };
function WeatherWidget() {
  const [city, setCity] = useState(""); const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function load(latitude: number, longitude: number, label: string) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
    if (!res.ok) throw new Error("Weather is unavailable. Try again.");
    const data = await res.json();
    if (!data.current || typeof data.current.temperature_2m !== "number") throw new Error("Weather is unavailable. Try again.");
    setWeather({ city: label, temperature: data.current.temperature_2m, code: data.current.weather_code });
  }
  async function search() {
    if (!city.trim() || busy) return; setBusy(true); setError("");
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`);
      if (!res.ok) throw new Error("City search is unavailable.");
      const place = (await res.json()).results?.[0];
      if (!place) throw new Error("City not found.");
      await load(place.latitude, place.longitude, `${place.name}, ${place.country_code}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Weather is unavailable."); } finally { setBusy(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setError("Location isn't available. Search a city instead."); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(p => { void load(p.coords.latitude, p.coords.longitude, "Your location").catch(() => setError("Weather is unavailable.")).finally(() => setBusy(false)); }, () => { setBusy(false); setError("Location unavailable. Search a city instead."); }, { timeout: 10000 });
  }
  return <><div className="flex items-center gap-3"><CloudSun className="size-8 text-star"/><div className="min-w-0">{weather ? <><p className="text-2xl font-medium">{Math.round(weather.temperature)}°C</p><p className="truncate text-xs">{weather.city} · {weatherLabel(weather.code)}</p></> : <p className="text-sm">Weather</p>}</div></div><form className="mt-3 flex gap-1" onSubmit={e => { e.preventDefault(); void search(); }}><Input aria-label="Weather city" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="h-8 min-w-0"/><Button size="sm" variant="secondary" disabled={busy || !city.trim()} type="submit">{busy ? "…" : "Find"}</Button><Button size="icon" variant="ghost" className="size-8 shrink-0" title="Use my location" aria-label="Use my location" disabled={busy} onClick={locate}><MapPin/></Button></form>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}<p className="mt-2 text-[10px] text-muted-foreground">Open-Meteo</p></>;
}
function NotesWidget() {
  const { user, guest } = useAuth(); const [note, setNote] = useState(""); const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => { setReady(false); setNote(""); if (user && !guest) { try { setNote(localStorage.getItem(notesKey(user.id)) ?? ""); } catch { setFailed(true); } } setReady(true); }, [user?.id, guest]);
  function update(value: string) { setNote(value); if (user && !guest) { try { localStorage.setItem(notesKey(user.id), value); setFailed(false); } catch { setFailed(true); } } }
  return <><h2 className="flex items-center gap-2 text-sm font-medium"><StickyNote className="size-4 text-star"/>Notes</h2><textarea aria-label="Desktop note" placeholder="What's on your mind?" disabled={!ready} value={note} onChange={e => update(e.target.value)} className="mt-3 h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"/><p className="text-[10px] text-muted-foreground">{guest || !user ? "Not saved in guest mode" : failed ? "Couldn't save on this device" : "Saved on this device"}</p></>;
}
function MusicWidget({ onMusic }: { onMusic: () => void }) {
  const player = usePlayer(); const track = player.queue[player.cur];
  return <><div className="flex items-center gap-3">{track?.art ? <img src={artUrl(track.art)} alt="" className="size-10 rounded object-cover"/> : <Music className="size-8 text-star"/>}<div className="min-w-0"><h2 className="truncate text-sm font-medium">{track?.title ?? "Music"}</h2><p className="truncate text-xs text-muted-foreground">{track?.artist ?? "Nothing playing"}</p></div></div>{track ? <><Slider aria-label="Music progress" className="mt-4" disabled={player.mode !== "audio"} min={0} max={Math.max(1, player.dur)} value={[Math.min(player.time, player.dur)]} onValueChange={v => seek(v[0] ?? 0)}/><div className="mt-3 flex justify-center gap-2"><Button size="icon" variant="ghost" title="Previous track" aria-label="Previous track" onClick={prev}><SkipBack/></Button><Button size="icon" variant="secondary" title={player.paused ? "Play" : "Pause"} aria-label={player.paused ? "Play" : "Pause"} onClick={toggle}>{player.paused ? <Play/> : <Pause/>}</Button><Button size="icon" variant="ghost" title="Next track" aria-label="Next track" onClick={next} disabled={player.cur >= player.queue.length - 1}><SkipForward/></Button></div>{player.status && <p className="mt-1 text-xs text-muted-foreground">{player.status}</p>}</> : <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={onMusic}><Music/>Open Music</Button>}</>;
}
export function DesktopWidgets({ onMusic }: { onMusic: () => void }) {
  const p = usePrefs(); const look = getAppearance(p); const layout = activeLayout(p);
  const root = useRef<HTMLElement>(null); const [area,setArea] = useState({width:1020,height:700});
  const [manager,setManager] = useState(false); const [editing,setEditing] = useState<string|null>(null);
  const widgets = look.desktopWidgets ?? (["weather","notes","music"] as const).filter(k=>look.widgets[k]).map((k,i)=>newWidget(k,`initial-${k}`,i));
  const save = (items: DesktopWidget[]) => setAppearance(layout,{desktopWidgets:items});
  const patch = (id:string, value:Partial<DesktopWidget>) => save(widgets.map(w=>w.id===id?{...w,...value}:w));
  const selected=widgets.find(w=>w.id===editing);
  useEffect(()=>{const node=root.current;if(!node)return;const observer=new ResizeObserver(([e])=>{if(e)setArea({width:e.contentRect.width,height:e.contentRect.height});});observer.observe(node);return()=>observer.disconnect();},[]);
  return <><aside ref={root} className="desktop-widget-canvas" aria-label="Desktop widgets">{widgets.map(raw=>{const w=widgetBounds(raw,area.width,area.height);return <Rnd key={w.id} bounds="parent" size={{width:w.width,height:w.height}} position={{x:w.x,y:w.y}} minWidth={Math.min(220,area.width)} minHeight={Math.min(160,area.height)} dragHandleClassName="widget-drag" cancel="button,input,textarea,a" onDragStop={(_e,d)=>patch(w.id,{x:d.x,y:d.y})} onResizeStop={(_e,_dir,ref,_delta,pos)=>patch(w.id,{width:ref.offsetWidth,height:ref.offsetHeight,x:pos.x,y:pos.y})} className="desktop-widget-position"><section className="desktop-widget-panel" data-glass={w.glass} aria-label={`${w.kind} widget`}><header className="widget-drag"><GripHorizontal className="size-4 shrink-0 text-muted-foreground"/><span className="min-w-0 flex-1 truncate text-xs font-medium">{w.title}</span><Button variant="ghost" size="icon" className="size-6" aria-label={`Customize ${w.title} widget`} title="Customize" onClick={()=>setEditing(w.id)}><Settings2 className="size-3"/></Button><Button variant="ghost" size="icon" className="size-6" title="Remove widget" aria-label={`Hide ${w.kind} widget`} onClick={()=>save(widgets.filter(i=>i.id!==w.id))}><X className="size-3"/></Button></header><div className="widget-body">{w.kind==="weather"?<WeatherWidget/>:w.kind==="notes"?<NotesWidget/>:w.kind==="music"?<MusicWidget onMusic={onMusic}/>:<ExtraWidget kind={w.kind}/>}</div></section></Rnd>;})}</aside><Button variant="secondary" size="sm" className="desktop-widget-add" aria-label="Add widgets" onClick={()=>setManager(true)}><Plus/>Widgets</Button><Dialog open={manager} onOpenChange={setManager}><DialogContent><DialogHeader><DialogTitle>Desktop widgets</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-2">{(Object.keys(WIDGET_NAMES) as WidgetKind[]).map(k=><Button key={k} variant="secondary" onClick={()=>{save([...widgets,newWidget(k,crypto.randomUUID(),widgets.length)]);setManager(false);}}><Plus/>{WIDGET_NAMES[k]}</Button>)}</div><Button variant="ghost" onClick={()=>save(widgets.map((w,i)=>({...newWidget(w.kind,w.id,i),title:w.title})))}><RotateCcw/>Reset positions</Button></DialogContent></Dialog><Dialog open={!!selected} onOpenChange={open=>{if(!open)setEditing(null);}}><DialogContent><DialogHeader><DialogTitle>Customize widget</DialogTitle></DialogHeader>{selected&&<><label className="space-y-2 text-sm">Title<Input aria-label="Widget title" value={selected.title} onChange={e=>patch(selected.id,{title:e.target.value})}/></label><div className="grid grid-cols-2 gap-3">{(["width","height"] as const).map(key=><label key={key} className="space-y-2 text-sm">{key}<Input type="number" aria-label={`Widget ${key}`} min={key==="width"?220:160} value={selected[key]} onChange={e=>patch(selected.id,{[key]:Number(e.target.value)})}/></label>)}</div><label className="flex items-center justify-between text-sm">Glass surface<Switch aria-label="Glass surface" checked={selected.glass} onCheckedChange={glass=>patch(selected.id,{glass})}/></label></>}</DialogContent></Dialog></>;
}