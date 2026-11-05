import { useMemo, useState } from "react";
import { Check, ExternalLink, Play, Search, X, SlidersHorizontal, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESKTOPHUT_WALLPAPERS } from "@/lib/astra/desktophut-wallpapers";
import { filterWallpapers, wallpaperCategories, WALLPAPER_CATEGORIES, wallpaperPatch, type CatalogWallpaper } from "@/lib/astra/wallpaper-catalog";
import { getAppearance, setAppearance, usePrefs } from "@/lib/astra/prefs";
import type { AppearanceLayout, AppearanceProfile } from "@/lib/astra/appearance";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { WALLPAPER_VIDEO_UPGRADES } from "@/lib/astra/wallpaper-originals";
import { upgradeWallpaperSource } from "@/lib/astra/wallpaper-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WallpaperCatalog({ layout, appearance, onChange }: { layout: AppearanceLayout; appearance?: AppearanceProfile; onChange?: (patch: Partial<AppearanceProfile>) => void }) {
  const prefs = usePrefs(); const look = appearance ?? getAppearance(prefs, layout);
  const set = (patch: Partial<AppearanceProfile>) => onChange ? onChange(patch) : setAppearance(layout, patch);
  const [query, setQuery] = useState(""); const [limit, setLimit] = useState(24);
  const [category, setCategory] = useState<typeof WALLPAPER_CATEGORIES[number]>("All");
  const [sort, setSort] = useState("latest");
  const [preview, setPreview] = useState<CatalogWallpaper | null>(null);
  const categoryCounts = useMemo(() => Object.fromEntries(WALLPAPER_CATEGORIES.map(value => [value, value === "All" ? DESKTOPHUT_WALLPAPERS.length : DESKTOPHUT_WALLPAPERS.filter(item => wallpaperCategories(item).includes(value)).length])), []);
  const matches = useMemo(() => {
    const filtered = filterWallpapers(DESKTOPHUT_WALLPAPERS, query, category);
    return sort === "title" ? filtered.sort((a, b) => a.title.localeCompare(b.title)) : sort === "resolution" ? filtered.sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution)) : filtered;
  }, [query, category, sort]);
  const current = upgradeWallpaperSource(["sony", "series", "wii", "neutral"].includes(layout) ? look.consoleCustomBg : look.customBg, WALLPAPER_VIDEO_UPGRADES);
  return <section className="wallpaper-browser border-b border-border py-6" aria-label="Live wallpaper catalog">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-medium">Wallpapers</h3><p className="mt-1 text-xs text-muted-foreground">{DESKTOPHUT_WALLPAPERS.length} live wallpapers</p></div><a href="https://www.desktophut.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground">DesktopHut <ExternalLink className="size-3"/></a></div>
    <div className="mb-4 flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search live wallpapers" placeholder="Search a title, character, or mood…" className="h-10 pl-9 pr-10" value={query} onChange={e => { setQuery(e.target.value); setLimit(24); }}/>{query && <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-8" aria-label="Clear wallpaper search" onClick={() => { setQuery(""); setLimit(24); }}><X/></Button>}</div><Select value={sort} onValueChange={value => { setSort(value); setLimit(24); }}><SelectTrigger aria-label="Sort wallpapers" className="h-10 w-40"><SlidersHorizontal className="size-3.5"/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="latest">Latest additions</SelectItem><SelectItem value="title">Title A–Z</SelectItem><SelectItem value="resolution">Resolution</SelectItem></SelectContent></Select></div>
    <div className="wallpaper-genres mb-4 flex gap-1 overflow-x-auto pb-2" role="group" aria-label="Wallpaper categories">{WALLPAPER_CATEGORIES.filter(value => (categoryCounts[value] ?? 0) > 0).map(value => <Button key={value} variant={category === value ? "secondary" : "ghost"} size="sm" aria-pressed={category === value} onClick={() => { setCategory(value); setLimit(24); }} className="shrink-0 gap-2">{value}<span className="text-[10px] text-muted-foreground">{categoryCounts[value]}</span></Button>)}</div>
    <p className="mb-3 text-xs text-muted-foreground" role="status" aria-live="polite">{matches.length} results{category !== "All" ? ` · ${category}` : ""}{query ? ` · “${query}”` : ""}</p>
    {look.wallpaperType === "video" && <label className="mb-4 flex items-center justify-between gap-3 text-sm">Animate wallpaper<Switch aria-label="Animate wallpaper" checked={look.wallpaperPlayback ?? (Boolean(look.wallpaperPoster) || !(look.reduceMotion || prefs.perfMode))} onCheckedChange={wallpaperPlayback => set({ wallpaperPlayback })}/></label>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{matches.slice(0, limit).map(item => <article key={item.id} className="wallpaper-tile min-w-0 overflow-hidden rounded-md border border-border bg-card">
      <Button variant="ghost" className="relative h-auto w-full rounded-none p-0" aria-label={`Preview ${item.title}`} onClick={() => setPreview(item)}><img src={item.image} alt={item.title} loading="lazy" width={480} height={270} className="aspect-video w-full object-cover"/><span className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground"><Play className="size-3"/></span></Button>
      <div className="p-2"><p className="line-clamp-2 min-h-10 text-xs leading-5" title={item.title}>{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.resolution}{item.originalQuality ? " · Original" : " · Limited quality"}</p><Button variant={current === item.video ? "secondary" : "ghost"} size="sm" className="mt-2 w-full" aria-label={`Use ${item.title}`} aria-pressed={current === item.video} onClick={() => set(wallpaperPatch(layout, item))}>{current === item.video ? <><Check/>Selected</> : "Use wallpaper"}</Button></div>
    </article>)}</div>
    {matches.length === 0 && <div className="py-8 text-center"><Search className="mx-auto mb-3 size-6 text-muted-foreground"/><p className="text-sm text-muted-foreground">No wallpapers found.</p><Button variant="ghost" className="mt-2" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</Button></div>}
    {limit < matches.length && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={() => setLimit(value => value + 24)}><ArrowDown/>Show more</Button></div>}
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">{preview && <><DialogTitle className="pr-5">{preview.title}</DialogTitle><video key={preview.video} src={preview.video} poster={preview.image} autoPlay muted loop playsInline controls className="aspect-video w-full rounded-md object-contain"/><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs text-muted-foreground">{preview.resolution} · {wallpaperCategories(preview).join(" / ")}</p><a href={preview.source} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground">Original download <ExternalLink className="size-4"/></a></div><Button onClick={() => { set(wallpaperPatch(layout, preview)); setPreview(null); }}><Check/>Use wallpaper</Button></div></>}</DialogContent></Dialog>
  </section>;
}