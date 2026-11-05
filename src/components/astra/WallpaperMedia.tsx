import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/astra/prefs";
import { shouldPlayWallpaper } from "@/lib/astra/wallpaper-playback";
import { WALLPAPER_VIDEO_UPGRADES } from "@/lib/astra/wallpaper-originals";
import { upgradeWallpaperSource } from "@/lib/astra/wallpaper-catalog";

/** Shared silent wallpaper playback; never used by standalone gameplay. */
export function WallpaperMedia({ src, type, poster, className, reduceMotion = false, playback }: {
  src: string; type?: "image" | "video" | undefined; poster?: string | undefined; className?: string; reduceMotion?: boolean; playback?: boolean | undefined;
}) {
  const prefs = usePrefs();
  const video = useRef<HTMLVideoElement>(null);
  const playbackChoice = playback ?? (poster ? true : undefined);
  const mediaSrc = type === "video" ? upgradeWallpaperSource(src, WALLPAPER_VIDEO_UPGRADES) : src;
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      node.muted = true;
      if (shouldPlayWallpaper({ hidden: document.hidden, playback: playbackChoice, reduceMotion, performance: prefs.perfMode, systemReducedMotion: motion.matches })) void node.play().catch(() => {});
      else node.pause();
    };
    update();
    node.addEventListener("loadeddata", update);
    node.addEventListener("canplay", update);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => { node.pause(); node.removeEventListener("loadeddata", update); node.removeEventListener("canplay", update); document.removeEventListener("visibilitychange", update); motion.removeEventListener("change", update); };
  }, [mediaSrc, type, reduceMotion, prefs.perfMode, playbackChoice]);
  return type === "video"
    ? <video ref={video} key={mediaSrc} src={mediaSrc} poster={poster} muted loop playsInline preload="auto" aria-hidden="true" className={className} data-wallpaper-video="true"/>
    : <img src={src} alt="" width={1920} height={1080} className={className}/>;
}