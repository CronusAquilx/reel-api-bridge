import { useEffect, useState, type CSSProperties } from "react";
import { Gamepad2, Film, Music, Settings } from "lucide-react";
import { LAYOUT_NAMES, type AppearanceLayout, type AppearanceProfile } from "@/lib/astra/appearance";
import { WallpaperMedia } from "./WallpaperMedia";
import { WallpaperEffects } from "./WallpaperEffects";
import desktopWallpaper from "@/assets/launcher-wallpaper.jpg";
import consoleWallpaper from "@/assets/console-landscape.jpg";
import { ACCENTS } from "@/lib/astra/prefs";

export function AppearancePreview({ layout, look }: { layout: AppearanceLayout; look: AppearanceProfile }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  const consoleMode = ["sony", "series", "wii", "neutral"].includes(layout);
  const src = (consoleMode ? look.consoleCustomBg : look.customBg) || (consoleMode ? consoleWallpaper : desktopWallpaper);
  const style = { "--star": look.customAccent || ACCENTS[look.accent] || "var(--primary)", "--preview-brightness": (look.brightness ?? 100) / 100, "--glass-opacity": `${look.glassOpacity ?? 65}%`, "--glass-blur": `${look.glassBlur ?? 24}px` } as CSSProperties;
  return <div className="personalization-preview" style={style} data-mode={look.mode} data-pattern={look.background} data-surface={look.appTransparency} data-layout={layout} role="img" aria-label={`${LAYOUT_NAMES[layout]} personalization preview`}>
    {look.artwork && <WallpaperMedia src={src} type={look.wallpaperType} poster={look.wallpaperPoster} playback={look.wallpaperPlayback} reduceMotion={look.reduceMotion} className="personalization-preview-wallpaper"/>}
    <div className="personalization-preview-pattern"/><WallpaperEffects appearance={look}/>
    <div className="personalization-preview-label">{LAYOUT_NAMES[layout]}</div>
    {look.showClock && <div className="personalization-preview-clock" data-clock-font={look.clockFont}><strong>{now?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", ...(look.clockSeconds ? { second: "2-digit" } : {}), hour12: !look.clock24Hour }) ?? "12:00"}</strong>{look.clockStyle !== "minimal" && <span>{now?.toLocaleDateString([], { weekday: "long" }) ?? "Monday"}</span>}{look.clockDate !== false && <small>{now?.toLocaleDateString([], { month: "long", day: "numeric" }) ?? "November 2"}</small>}</div>}
    <div className="personalization-preview-dock">{[Gamepad2, Film, Music, Settings].map((Icon, i) => <span key={i}><Icon/></span>)}</div>
  </div>;
}