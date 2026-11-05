import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppearanceProfile } from "@/lib/astra/appearance";

export function PersonalizationControls({ look, onChange }: { look: AppearanceProfile; onChange: (patch: Partial<AppearanceProfile>) => void }) {
  const row = (label: string, child: React.ReactNode) => <label className="personalization-control"><span>{label}</span>{child}</label>;
  return <section className="border-b py-4" aria-label="Extra personalization">
    {row(`Brightness · ${look.brightness ?? 100}%`, <Slider aria-label="Brightness" className="w-40" min={50} max={120} step={5} value={[look.brightness ?? 100]} onValueChange={v => onChange({ brightness: v[0] ?? 100 })}/>)}
    {row(`Glass opacity · ${look.glassOpacity ?? 65}%`, <Slider aria-label="Glass opacity" className="w-40" min={25} max={95} step={5} value={[look.glassOpacity ?? 65]} onValueChange={v => onChange({ glassOpacity: v[0] ?? 65 })}/>)}
    {row(`Glass blur · ${look.glassBlur ?? 24}`, <Slider aria-label="Glass blur" className="w-40" min={0} max={40} step={2} value={[look.glassBlur ?? 24]} onValueChange={v => onChange({ glassBlur: v[0] ?? 24 })}/>)}
    {row("Effect speed", <Slider aria-label="Effect speed" className="w-40" min={0.25} max={2} step={0.25} value={[look.effectSpeed ?? 1]} onValueChange={v => onChange({ effectSpeed: v[0] ?? 1 })}/>)}
    {row("Clock style", <Select value={look.clockStyle ?? "weekday"} onValueChange={v => onChange({ clockStyle: v as NonNullable<AppearanceProfile["clockStyle"]> })}><SelectTrigger aria-label="Clock style" className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="weekday">Weekday</SelectItem><SelectItem value="minimal">Minimal</SelectItem><SelectItem value="large">Large time</SelectItem></SelectContent></Select>)}
    {row("24-hour clock", <Switch aria-label="24-hour clock" checked={look.clock24Hour ?? false} onCheckedChange={clock24Hour => onChange({ clock24Hour })}/>)}
    {row("Clock seconds", <Switch aria-label="Clock seconds" checked={look.clockSeconds ?? false} onCheckedChange={clockSeconds => onChange({ clockSeconds })}/>)}
    {row("Clock date", <Switch aria-label="Clock date" checked={look.clockDate ?? true} onCheckedChange={clockDate => onChange({ clockDate })}/>)}
    {row("Desktop icon labels", <Switch aria-label="Desktop icon labels" checked={look.iconLabels ?? true} onCheckedChange={iconLabels => onChange({ iconLabels })}/>)}
    {row("Dock magnification", <Switch aria-label="Dock magnification" checked={look.dockMotion ?? true} onCheckedChange={dockMotion => onChange({ dockMotion })}/>)}
  </section>;
}