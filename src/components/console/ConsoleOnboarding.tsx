import { useState } from "react";
import { Laptop, Monitor, Smartphone, Tablet, Gamepad2, LayoutGrid, ArrowLeft, ArrowUpRight, Music, Film, Bot, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs, setPrefs, setAppearance, flushPreferences, getPrefsSnapshot, type Prefs } from "@/lib/astra/prefs";
import { ConsoleShell } from "./ConsoleShell";
import { useConsoleInput } from "@/lib/console/nav";
import { useVisit } from "@/lib/console/visit";
import { useServerFn } from "@tanstack/react-start";
import { finishAccountSetup } from "@/lib/astra/accounts.functions";
import { useNavigate } from "@tanstack/react-router";
import { visitDestination } from "@/lib/console/visit";
import { toast } from "sonner";
import { activeLayout, type AppearanceProfile } from "@/lib/astra/appearance";
import { PersonalizationSetup } from "./PersonalizationSetup";
import { LayoutPreview } from "./LayoutPreview";
export function ConsoleOnboarding({accountSetup=false}:{accountSetup?:boolean}) {
 const p=usePrefs();const {send}=useVisit();const [step,setStep]=useState(accountSetup?1:0);const [selected,setSelected]=useState(0);
 const finish=useServerFn(finishAccountSetup); const navigate=useNavigate();const [busy,setBusy]=useState(false);
 const choices=step===0 ? [{label:"PlayStation / PS5",icon:Gamepad2,value:"sony"},{label:"Xbox Series X",icon:Gamepad2,value:"series"},{label:"Wii",icon:Gamepad2,value:"wii"},{label:"Neutral",icon:LayoutGrid,value:"neutral"},{label:"Windows",icon:Monitor,value:"windows"},{label:"macOS",icon:Laptop,value:"macos"},{label:"iPad",icon:Tablet,value:"ipad"},{label:"Switch",icon:Gamepad2,value:"switch"}] : step===1 ? [{label:"Laptop / desktop",icon:Monitor,value:"desktop"},{label:"Phone",icon:Smartphone,value:"phone"},{label:"Tablet",icon:Tablet,value:"tablet"}] : [{label:"Everything",icon:LayoutGrid,value:"all"},{label:"Games",icon:Gamepad2,value:"games"},{label:"Music",icon:Music,value:"music"},{label:"Movies",icon:Film,value:"movies"},{label:"AI",icon:Bot,value:"ai"},{label:"Web",icon:Globe,value:"web"}];
 const confirm = async (look: AppearanceProfile) => { setBusy(true); try { setAppearance(activeLayout(p), look); setPrefs({ consoleSetup: true }); await flushPreferences(); await finish(); send("account-confirmed"); await navigate({to:visitDestination(getPrefsSnapshot()),replace:true}); } catch(e) { toast.error(e instanceof Error ? e.message : "Couldn't save setup"); } finally { setBusy(false); } };
 const choose=async(n:number)=>{const c=choices[n];if(!c||busy||step===3)return;if(step===0){const consoleSkin=c.value==="sony"||c.value==="series"||c.value==="wii"||c.value==="neutral"?c.value:"off";setPrefs({console:consoleSkin,layout:c.value==="switch"||c.value==="macos"||c.value==="ipad"?c.value:"windows"});send("choices-complete");return;}else if(step===1)setPrefs({device:c.value as Prefs["device"]});else setPrefs({focus:c.value as Prefs["focus"]});setStep(step+1);setSelected(0);};
 useConsoleInput(a=>{if(a==="left")setSelected(Math.max(0,selected-1));if(a==="right")setSelected(Math.min(choices.length-1,selected+1));if(a==="select")choose(selected);if(a==="back"&&step>0){setStep(step-1);setSelected(0);}});
 if(step===3)return <PersonalizationSetup busy={busy} onBack={()=>setStep(2)} onConfirm={look=>void confirm(look)}/>;
 return <ConsoleShell><main className={`layout-chooser ${step===0?"is-layout-step":""}`}>
   <header className="layout-chooser-header"><span className="layout-wordmark">birch<span>OS</span></span><span className="text-xs text-console-foreground/55">{step===0?"Your space. Your style.":"Make it yours."}</span></header>
   <div className="layout-chooser-content" key={step}><div className="layout-chooser-heading"><div><p className="mb-2 text-xs text-console-foreground/55">{step===0?"WELCOME HOME":"PERSONALIZE"}</p><h1 className="text-3xl font-medium md:text-4xl">{step===0?"Choose your layout":step===1?"Your device":"Your favorites"}</h1></div><span className="layout-step-mark">0{step+1}<span> / 03</span></span></div>
   <div className={`layout-choice-grid ${step===0?"":"layout-choice-simple"}`}>{choices.map((c,n)=><Button key={c.value} variant="console" size="console" aria-label={c.label} onClick={()=>void choose(n)} onFocus={()=>setSelected(n)} onPointerEnter={()=>setSelected(n)} className={`layout-choice ${n===selected?"is-highlighted":""}`}>
     {step===0?<LayoutPreview layout={c.value}/>:<div className="layout-choice-symbol"><c.icon/></div>}
     <span className="layout-choice-label"><span className="flex min-w-0 items-center gap-2"><c.icon className="size-4 shrink-0"/><span>{c.label}</span></span><ArrowUpRight className="layout-choice-arrow size-4"/></span>
   </Button>)}</div></div>
   <footer className="layout-chooser-footer"><span className="flex items-center gap-2"><Check className="size-3.5"/>{step===0?"8 layouts":p.console!=="off"?"Console edition":"Desktop edition"}</span>{step>0&&<Button variant="console" size="sm" onClick={()=>{setStep(step-1);setSelected(0);}}><ArrowLeft/>Back</Button>}<span>Birch OS</span></footer>
 </main></ConsoleShell>;
}
