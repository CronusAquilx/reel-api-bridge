import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { guestMovies } from "@/lib/console/guest-movies.functions";
import { STREAMING_SERVERS } from "@/lib/movies/tmdb";
import { useState } from "react";
import { Input } from "@/components/ui/input";
export function GuestMovies({onPlay}:{onPlay:(name:string,url:string)=>void}) {
  const load=useServerFn(guestMovies);const {data,isPending,error}=useQuery({queryKey:["guest-movies"],queryFn:()=>load()});const [q,setQ]=useState("");
  const [source,setSource]=useState("apiplayer");
  return <><div className="mb-6 flex max-w-2xl flex-wrap gap-3"><Input aria-label="Filter guest movies" placeholder="Filter movies" value={q} onChange={e=>setQ(e.target.value)} className="max-w-sm"/><select aria-label="Movie source" value={source} onChange={e=>setSource(e.target.value)} className="console-input">{STREAMING_SERVERS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>{isPending&&<p>Loading movies…</p>}{error&&<p role="alert">{error.message}</p>}<div className="mb-9 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">{data?.filter(m=>m.title.toLowerCase().includes(q.toLowerCase())).map(m=><Button key={m.id} variant="console" size="console" className="h-auto flex-col items-stretch overflow-hidden rounded-lg border border-console-foreground/20 p-0 text-left" onClick={()=>{const server=STREAMING_SERVERS.find(s=>s.id===source);if(server)onPlay(m.title,server.url(m.id,"movie"));}}>{m.poster&&<img src={m.poster} alt={m.title} className="aspect-[2/3] w-full object-cover" loading="lazy"/>}<span className="p-3 text-sm">{m.title}</span></Button>)}</div><h2 className="mb-4 text-xl">Streaming apps</h2></>;
}