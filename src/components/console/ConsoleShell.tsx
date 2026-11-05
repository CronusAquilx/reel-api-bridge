import type { CSSProperties, ReactNode } from "react";
import { getAppearance, usePrefs } from "@/lib/astra/prefs";
import landscape from "@/assets/console-landscape.jpg";
import referenceWallpaper from "@/assets/neutral-console-wallpaper.jpg";
import { SocialAccess } from "@/components/social/SocialAccess";
import { WebsiteFullscreenButton } from "@/components/FullscreenButton";
import { useVisit } from "@/lib/console/visit";
import { WallpaperEffects } from "@/components/astra/WallpaperEffects";
import { WallpaperMedia } from "@/components/astra/WallpaperMedia";
export function ConsoleShell({ hue = 210, children, bg }: { hue?: number; children: ReactNode; bg?: string }) {
  const p = usePrefs(); const look = getAppearance(p); const {stage}=useVisit(); const image = p.consoleBg === "custom" && p.consoleCustomBg ? p.consoleCustomBg : p.console === "neutral" || p.console === "series" || p.console === "sony" ? referenceWallpaper : landscape;
  return <div className={`console-shell skin-${p.console} ${p.console === "series" ? "xbox-series" : ""} fixed inset-0 overflow-hidden bg-console-background text-console-foreground`} style={{ "--console-hue": hue, "--console-secondary": (hue + 60) % 360 } as CSSProperties}>
    <div className="console-backdrop pointer-events-none absolute inset-0">{look.artwork && p.consoleBg !== "focused" && <WallpaperMedia src={image} type={p.consoleBg === "custom" ? look.wallpaperType : "image"} poster={look.wallpaperPoster} playback={look.wallpaperPlayback} reduceMotion={look.reduceMotion} className="h-full w-full object-cover"/>}<div className="absolute inset-0 console-shade"/>{p.consoleBg === "focused" && <div className="absolute inset-0" style={{ background: bg ?? "var(--console-scene)" }}/>}</div>
    <WallpaperEffects/>
    <div className="console-page relative h-full">{children}{stage==="ready"&&<SocialAccess floating />}<WebsiteFullscreenButton/></div>
  </div>;
}
