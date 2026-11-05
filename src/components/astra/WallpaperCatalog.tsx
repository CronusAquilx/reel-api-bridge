import { useState } from "react";
import { Check, ExternalLink, Play, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESKTOPHUT_WALLPAPERS } from "@/lib/astra/desktophut-wallpapers";
import { filterWallpapers, wallpaperPatch, type CatalogWallpaper } from "@/lib/astra/wallpaper-catalog";
import { getAppearance, setAppearance, usePrefs } from "@/lib/astra/prefs";
import type { AppearanceLayout, AppearanceProfile } from "@/lib/astra/appearance";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { WALLPAPER_VIDEO_UPGRADES } from "@/lib/astra/wallpaper-originals";
import { upgradeWallpaperSource } from "@/lib/astra/wallpaper-catalog";

export function WallpaperCatalog({ layout, appearance, onChange }: { layout: AppearanceLayout; appearance?: AppearanceProfile; onChange?: (patch: Partial<AppearanceProfile>) => void }) {
  const prefs = usePrefs(); const look = appearance ?? getAppearance(prefs, layout);
  const set = (patch: Partial<AppearanceProfile>) => onChange ? onChange(patch) : setAppearance(layout, patch);
  const [query, setQuery] = useState(""); const [limit, setLimit] = useState(24);
  const [preview, setPreview] = useState<CatalogWallpaper | null>(null);
  const matches = filterWallpapers(DESKTOPHUT_WALLPAPERS, query);
  const current = upgradeWallpaperSource(["sony", "series", "wii", "neutral"].includes(layout) ? look.consoleCustomBg : look.customBg, WALLPAPER_VIDEO_UPGRADES);
  return <section className="border-b border-border py-6" aria-label="Live wallpaper catalog">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-medium">Live wallpapers <span className="text-sm text-muted-foreground">· {DESKTOPHUT_WALLPAPERS.length}</span></h3><a href="https://www.desktophut.com/search/Live-Wallpaper%204K" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground">DesktopHut <ExternalLink className="size-3"/></a></div>
    <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search live wallpapers" placeholder="Search wallpapers…" className="pl-9 pr-10" value={query} onChange={e => { setQuery(e.target.value); setLimit(24); }}/>{query && <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-8" aria-label="Clear wallpaper search" onClick={() => { setQuery(""); setLimit(24); }}><X/></Button>}</div>
    <p className="mb-3 text-xs text-muted-foreground">{matches.length} wallpapers · original quality</p>
    {look.wallpaperType === "video" && <label className="mb-4 flex items-center justify-between gap-3 text-sm">Animate wallpaper<Switch aria-label="Animate wallpaper" checked={look.wallpaperPlayback ?? (Boolean(look.wallpaperPoster) || !(look.reduceMotion || prefs.perfMode))} onCheckedChange={wallpaperPlayback => set({ wallpaperPlayback })}/></label>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{matches.slice(0, limit).map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
      <Button variant="ghost" className="relative h-auto w-full rounded-none p-0" aria-label={`Preview ${item.title}`} onClick={() => setPreview(item)}><img src={item.image} alt={item.title} loading="lazy" width={480} height={270} className="aspect-video w-full object-cover"/><span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground"><Play className="size-3"/></span></Button>
      <div className="p-2"><p className="line-clamp-2 min-h-10 text-xs leading-5" title={item.title}>{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.resolution}{item.originalQuality ? " · Original" : " · Limited quality"}</p><Button variant={current === item.video ? "secondary" : "ghost"} size="sm" className="mt-2 w-full" aria-label={`Use ${item.title}`} aria-pressed={current === item.video} onClick={() => set(wallpaperPatch(layout, item))}>{current === item.video ? <><Check/>Selected</> : "Use wallpaper"}</Button></div>
    </article>)}</div>
    {matches.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No wallpapers found.</p>}
    {limit < matches.length && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={() => setLimit(value => value + 24)}>Show more</Button></div>}
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">{preview && <><DialogTitle className="pr-5">{preview.title}</DialogTitle><video key={preview.video} src={preview.video} poster={preview.image} autoPlay muted loop playsInline controls className="aspect-video w-full rounded-md object-contain"/><div className="flex flex-wrap items-center justify-between gap-3"><a href={preview.source} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground">Original 4K download <ExternalLink className="size-4"/></a><Button onClick={() => { set(wallpaperPatch(layout, preview)); setPreview(null); }}><Check/>Use wallpaper</Button></div></>}</DialogContent></Dialog>
  </section>;
}