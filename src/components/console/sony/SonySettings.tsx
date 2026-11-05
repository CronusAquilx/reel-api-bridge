import { useState } from "react";
import { Accessibility, Image, Monitor, User, Database, Volume2, Gamepad2, LogOut, Globe, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPrefs } from "@/lib/astra/prefs";
import { useConsoleInput } from "@/lib/console/nav";
import { useConsoleCtx } from "@/lib/console/ctx";
import { ConsoleShell } from "../ConsoleShell";
import { BackButton } from "../shared";
import { cn } from "@/lib/utils";
import { AppearanceSettings } from "@/components/astra/AppearanceSettings";
import { XboxGuide } from "../xbox/XboxGuide";
import { DeveloperGameSettings } from "@/components/games/DeveloperGameSettings";
import { useDeveloperGameAccess } from "@/lib/games/developer-games";
import { SKINS, SKIN_NAME } from "@/lib/console/skins";
const ROWS=[{id:"social",label:"Friends & Social Privacy",icon:User},{id:"appearance",label:"Background & Appearance",icon:Image},{id:"accessibility",label:"Accessibility",icon:Accessibility},{id:"network",label:"Network",icon:Globe},{id:"users",label:"Users and Accounts",icon:User},{id:"system",label:"System",icon:Monitor},{id:"storage",label:"Storage",icon:Database},{id:"sound",label:"Sound",icon:Volume2},{id:"screen",label:"Screen and Video",icon:Monitor},{id:"skin",label:"Layout",icon:Gamepad2},{id:"exit",label:"Exit Console Mode",icon:LogOut}];
export function SonySettings(){
 const {data:developer}=useDeveloperGameAccess();const rows=developer?[...ROWS,{id:"developer",label:"Developer games",icon:Gamepad2}]:ROWS;
 const {go,p,lib}=useConsoleCtx();const [guide,setGuide]=useState(false);const [i,setI]=useState(0);const [page,setPage]=useState<string|null>(null);const [note,setNote]=useState("");const [online]=useState(true);const [bg,setBg]=useState(p.consoleCustomBg);
 const activate=(n:number)=>{const row=rows[n];if(!row)return;if(row.id==="social")go("/console/social");else if(row.id==="users")go("/console/profile");else if(row.id==="storage")go("/console/library");else if(row.id==="exit")go("/home");else setPage(row.id);};
 useConsoleInput(a=>{if(a==="menu"&&p.console==="series"){setGuide(true);return;}if(a==="back"){if(page)setPage(null);else go("/console");return;}if(page)return;if(a==="up")setI(Math.max(0,i-1));if(a==="down")setI(Math.min(rows.length-1,i+1));if(a==="select")activate(i);},!guide);
 const toggle=(label:string,value:boolean,onChange:()=>void)=><label className="flex items-center justify-between gap-6 border-b border-console-foreground/10 py-5"><span>{label}</span><input type="checkbox" checked={value} onChange={onChange} className="console-checkbox size-5"/></label>;
 return <ConsoleShell><div className="console-settings-app mx-auto flex h-full max-w-5xl flex-col px-5 py-6 md:px-10 md:py-8"><header className="mb-7 flex items-center gap-4"><BackButton onClick={()=>page?setPage(null):go("/console")}/><h1 className="text-2xl font-light md:text-3xl">{page?rows.find(r=>r.id===page)?.label:"Settings"}</h1></header><div className={cn("min-h-0 flex-1 overflow-y-auto pb-10",!page&&"console-settings-categories")}>{!page?rows.map((r,n)=><Button key={r.id} variant="console" size="console" onFocus={()=>setI(n)} onClick={()=>activate(n)} className={cn("flex w-full items-center gap-5 border-b border-console-foreground/15 px-5 py-5 text-left text-base md:text-xl",n===i&&"rounded-sm outline-2 outline-console-foreground")}><r.icon className="size-6 shrink-0"/><span className="flex-1">{r.label}</span>{r.id==="storage"&&<span className="text-sm text-console-foreground/50">{lib.installed.length} games</span>}</Button>):<section className="max-w-3xl text-console-foreground/85">
 {page==="appearance"&&<AppearanceSettings/>}
 {page==="developer"&&<DeveloperGameSettings/>}
 {page==="accessibility"&&<>{toggle("Reduce motion",p.reduceMotion,()=>setPrefs({reduceMotion:!p.reduceMotion}))}<label className="mt-6 block">Text size · {p.fontScale}%<input type="range" min={85} max={125} step={5} value={p.fontScale} onChange={e=>setPrefs({fontScale:Number(e.target.value)})} className="console-range mt-4 w-full"/></label></>}
 {page==="network"&&<><p className="text-xl">{online?"Connected":"Offline"}</p><Button variant="console" size="console" onClick={()=>window.location.reload()} className="mt-6 rounded-full bg-console-foreground/10 px-6 py-3">Reconnect</Button></>}
 {page==="system"&&<><label className="block">Device<select aria-label="Device" value={p.device} onChange={e=>setPrefs({device:e.target.value as typeof p.device})} className="console-input mt-4 w-full"><option value="desktop">Laptop / desktop</option><option value="phone">Phone</option><option value="tablet">Tablet</option></select></label><Button variant="console" size="console" onClick={()=>setPrefs({device:"",consoleSetup:false})} className="mt-8 rounded-full bg-console-foreground/10 px-6 py-3">Run welcome setup again</Button></>}
 {page==="sound"&&toggle("Focus sounds",p.consoleSounds,()=>setPrefs({consoleSounds:!p.consoleSounds}))}
 {page==="screen"&&<>{toggle("Performance mode",p.perfMode,()=>setPrefs({perfMode:!p.perfMode}))}{toggle("Show clock",p.showClock,()=>setPrefs({showClock:!p.showClock}))}<Button variant="console" size="console" onClick={()=>{void (document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>setNote("Full screen isn't available on this device."));}} className="mt-6 rounded-full bg-console-foreground/10 px-6 py-3">Toggle full screen</Button></>}
 {page==="skin"&&<div className="flex flex-col gap-4">{SKINS.filter(id=>id!=="classic").map(id=><Button key={id} variant="console" size="console" className="justify-start rounded-lg bg-console-panel/70 p-5" onClick={()=>{setPrefs({console:id});go("/console");}}>{SKIN_NAME[id]}</Button>)}{(["windows","switch"] as const).map(layout=><Button key={layout} variant="console" size="console" className="justify-start rounded-lg bg-console-panel/70 p-5" onClick={()=>{setPrefs({console:"off",layout});go(layout==="windows"?"/desktop":"/home");}}>{layout==="windows"?"Windows":"Switch"}</Button>)}</div>}
 <p aria-live="polite" className="mt-5 text-sm text-console-foreground/60">{note}</p><Button variant="console" size="console" onClick={()=>{setPage(null);setNote("");}} className="mt-8"><ArrowLeft/>All settings</Button></section>}</div></div>{guide&&<XboxGuide close={()=>setGuide(false)}/>}</ConsoleShell>;
}
