import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Film, Music, Palette, ArrowLeft, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsoleShell } from "./ConsoleShell";
import { CLOUD_GAMES } from "@/lib/games/cloud-catalog";
import { STREAMING_APPS } from "@/lib/console/streaming";
import { siteThumbnail } from "@/lib/console/catalog";
import { usePrefs } from "@/lib/astra/prefs";
import { useVisit } from "@/lib/console/visit";
import { openProxied } from "@/lib/astra/proxy";
import { attachProxiedPopups } from "@/lib/astra/proxy-popups";
import { AppearanceSettings } from "@/components/astra/AppearanceSettings";
import landscape from "@/assets/console-landscape.jpg";
import { GuestMovies } from "./GuestMovies";

type Arcade = { id:number; name:string; file:string; cover:string };
export function GuestHome() {
  const p=usePrefs();const {send}=useVisit();
  const [tab,setTab]=useState("games");const [q,setQ]=useState("");const [arcade,setArcade]=useState<Arcade[]>([]);const [error,setError]=useState("");
  const [playing,setPlaying]=useState<{name:string;url:string;arcade?:boolean}|null>(null);const [web,setWeb]=useState("");
  const ref=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{fetch("/api/public/games/list").then(r=>{if(!r.ok)throw new Error("Arcade catalog couldn't load.");return r.json();}).then(setArcade).catch(e=>setError(e.message));},[]);
  useEffect(()=>{const frame=ref.current;if(!frame||!playing)return;setError("");const detach=attachProxiedPopups(frame,playing.url,p);if(playing.arcade)frame.src=playing.url;else void openProxied(frame,playing.url,p).catch(e=>setError(e.message));return()=>{detach();frame.src="about:blank";};},[playing,p.transport,p.wisp]);
  const openSite=(name:string,url:string)=>setPlaying({name,url});
  return <ConsoleShell><div className="flex h-full min-h-0 flex-col"><header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-console-foreground/15 px-6 py-4"><div><strong>Guest</strong><span className="ml-3 text-sm text-console-foreground/60">Nothing saves to an account</span></div><Button variant="console" size="console" onClick={()=>send("restart")}>Switch user / layout</Button></header>
    {playing?<><div className="flex items-center gap-3 p-3"><Button variant="console" size="console" onClick={()=>setPlaying(null)}><ArrowLeft/>Back</Button><span>{playing.name}</span></div>{error&&<p role="alert" className="p-3 text-destructive">{error}</p>}<iframe ref={ref} title={playing.name} className="min-h-0 w-full flex-1 border-0 bg-background" sandbox={playing.arcade?"allow-scripts allow-pointer-lock allow-forms allow-modals allow-popups allow-downloads allow-presentation":undefined} allow="fullscreen; autoplay; encrypted-media; gamepad; pointer-lock" allowFullScreen/></>:<>
    <nav aria-label="Guest applications" className="flex shrink-0 gap-2 overflow-x-auto px-6 py-4">{[{id:"games",name:"Games",icon:Gamepad2},{id:"movies",name:"Movies",icon:Film},{id:"music",name:"Music",icon:Music},{id:"web",name:"Web",icon:Globe},{id:"appearance",name:"Appearance",icon:Palette}].map(t=><Button key={t.id} variant="console" size="console" aria-pressed={tab===t.id} className={tab===t.id?"bg-console-foreground/15":""} onClick={()=>{setTab(t.id);setQ("");}}><t.icon/>{t.name}</Button>)}</nav>
    <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-10"><h1 className="mb-6 text-3xl font-light">{tab==="games"?"Play as a guest":tab==="movies"?"Movies & TV":tab==="music"?"Music":tab==="web"?"Browser":"Appearance"}</h1>
    {tab==="movies"&&<GuestMovies onPlay={openSite}/>}
    {tab==="appearance"?<AppearanceSettings/>:tab==="web"?<form className="flex max-w-2xl gap-2" onSubmit={e=>{e.preventDefault();try{const u=new URL(web.includes("://")?web:`https://${web}`);if(u.protocol!=="https:")throw new Error();openSite(u.hostname,u.href);}catch{setError("Enter a valid HTTPS website.");}}}><Input aria-label="Website address" placeholder="Website address" value={web} onChange={e=>setWeb(e.target.value)} required/><Button type="submit">Open</Button></form>:tab==="games"?<><div className="mb-6 flex max-w-md items-center gap-3"><Search className="size-4"/><Input aria-label="Search guest games" placeholder="Search games" value={q} onChange={e=>setQ(e.target.value)}/></div><h2 className="mb-4 text-xl">Cloud Games</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">{CLOUD_GAMES.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())).map(g=><Link key={g.url+g.name} to="/guest-play" search={{url:g.url,name:g.name}} target="_blank" rel="noopener" className="overflow-hidden rounded-lg border border-console-foreground/20 bg-console-panel/60"><img src={siteThumbnail(g.url)} alt={g.name} className="aspect-video w-full object-cover" loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=landscape;}}/><p className="p-3 text-sm">{g.name}</p></Link>)}</div><h2 className="mb-4 mt-9 text-xl">Arcade</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">{arcade.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())).slice(0,120).map(g=><Button key={g.id} variant="console" size="console" className="h-auto flex-col items-stretch overflow-hidden rounded-lg border border-console-foreground/20 p-0 text-left" onClick={()=>setPlaying({name:g.name,url:`/api/public/games/play/${g.file}`,arcade:true})}><img src={`/api/public/games/cover/${g.cover}`} alt={g.name} className="aspect-video w-full object-cover" loading="lazy"/><span className="p-3 text-sm">{g.name}</span></Button>)}</div></>:<div className="grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-3">{(tab==="music"?[{title:"YouTube Music",url:"https://music.youtube.com/"},{title:"SoundCloud",url:"https://soundcloud.com/"},{title:"Spotify",url:"https://open.spotify.com/"}]:[{title:"Movies",url:"https://apiplayer.ru/"},...STREAMING_APPS]).map(a=><Button key={a.title} variant="console" size="console" className="h-auto flex-col items-stretch overflow-hidden rounded-lg border border-console-foreground/20 p-0 text-left" onClick={()=>openSite(a.title,a.url)}><img src={siteThumbnail(a.url)} alt={a.title} className="aspect-video w-full object-cover" loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=landscape;}}/><span className="p-4">{a.title}</span></Button>)}</div>}
    {error&&<p role="alert" className="mt-4 text-destructive">{error}</p>}</main></>}
  </div></ConsoleShell>;
}