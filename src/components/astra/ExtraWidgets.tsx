import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WidgetKind } from "@/lib/astra/widget-layout";

function Counter({ countdown }: { countdown: boolean }) {
  const [seconds, setSeconds] = useState(countdown ? 1500 : 0);
  const [minutes, setMinutes] = useState(25); const [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const timer = setInterval(() => setSeconds(s => countdown ? Math.max(0, s - 1) : s + 1), 1000); return () => clearInterval(timer); }, [running, countdown]);
  useEffect(() => { if (countdown && seconds === 0) setRunning(false); }, [seconds, countdown]);
  return <div className="flex h-full flex-col items-center justify-center gap-3"><output className="text-3xl tabular-nums">{Math.floor(seconds / 60).toString().padStart(2,"0")}:{(seconds % 60).toString().padStart(2,"0")}</output>{countdown && <Input type="number" aria-label="Focus duration in minutes" min={1} max={180} value={minutes} className="h-8 w-24" disabled={running} onChange={e => { const m = Math.max(1, Math.min(180, Number(e.target.value))); setMinutes(m); setSeconds(m * 60); }}/>}<div className="flex gap-2"><Button variant="secondary" size="icon" aria-label={running ? "Pause timer" : "Start timer"} title={running ? "Pause" : "Start"} onClick={() => setRunning(!running)}>{running ? <Pause/> : <Play/>}</Button><Button variant="ghost" size="icon" aria-label="Reset timer" title="Reset" onClick={() => { setRunning(false); setSeconds(countdown ? minutes * 60 : 0); }}><RotateCcw/></Button></div></div>;
}
function Calendar() {
  const [date, setDate] = useState<Date | null>(null);
  useEffect(() => { setDate(new Date()); }, []);
  if (!date) return null;
  const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return <><p className="mb-3 text-sm font-medium">{date.toLocaleDateString([], { month:"long", year:"numeric" })}</p><div className="grid grid-cols-7 gap-1 text-center text-xs">{"SMTWTFS".split("").map((d,i) => <span key={`day${i}`} className="text-muted-foreground">{d}</span>)}{Array.from({length:first},(_,i)=><span key={`blank${i}`}/>)}{Array.from({length:count},(_,i)=><span key={i} className={`py-1 ${i + 1 === date.getDate() ? "rounded bg-star text-primary-foreground" : ""}`}>{i+1}</span>)}</div></>;
}
function Calculator() {
  const [a,setA] = useState(0); const [b,setB] = useState(0); const [op,setOp] = useState("+");
  const result = op === "+" ? a+b : op === "−" ? a-b : op === "×" ? a*b : b === 0 ? "Cannot divide by zero" : a/b;
  return <div className="space-y-3"><div className="flex gap-2"><Input type="number" aria-label="First number" value={a} onChange={e=>setA(Number(e.target.value))}/><Input type="number" aria-label="Second number" value={b} onChange={e=>setB(Number(e.target.value))}/></div><div className="flex justify-center gap-1">{["+","−","×","÷"].map(v=><Button key={v} variant={op===v?"secondary":"ghost"} size="icon" onClick={()=>setOp(v)} aria-label={v}>{v}</Button>)}</div><output className="block break-words text-center text-xl">{result}</output></div>;
}
function QuickLinks() {
  const [links, setLinks] = useState<{label:string; url:string}[]>([]); const [label,setLabel]=useState(""); const [url,setUrl]=useState(""); const [error,setError]=useState("");
  return <><div className="space-y-1">{links.map((l,i)=><Button asChild key={i} variant="ghost" className="w-full justify-start truncate"><a href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink/>{l.label}</a></Button>)}</div><form className="mt-2 space-y-2" onSubmit={e=>{e.preventDefault();try { const parsed=new URL(url); if(parsed.protocol!=="https:") throw new Error();setLinks([...links,{label:label||parsed.hostname,url:parsed.href}]);setLabel("");setUrl("");setError(""); }catch {setError("Enter an HTTPS address.");}}}><Input aria-label="Link name" placeholder="Name" value={label} onChange={e=>setLabel(e.target.value)}/><Input aria-label="Link address" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)}/><Button variant="secondary" type="submit" size="sm">Add link</Button>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</form></>;
}
export function ExtraWidget({ kind }: {kind:WidgetKind}) {
  if(kind==="calendar") return <Calendar/>;
  if(kind==="timer"||kind==="stopwatch") return <Counter countdown={kind==="timer"}/>;
  if(kind==="calculator") return <Calculator/>;
  return <QuickLinks/>;
}