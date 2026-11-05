import type { AppearanceLayout, AppearanceProfile } from "./appearance";

export type CatalogWallpaper = {
  id: string;
  title: string;
  source: string;
  video: string;
  image: string;
  resolution: string;
  originalQuality?: boolean;
};

export function upgradeWallpaperSource(src: string, upgrades: Record<string, string>): string {
  if (upgrades[src]) return upgrades[src];
  try {
    const path = new URL(src, "https://wallpaper.local").pathname;
    return upgrades[path] ?? src;
  } catch { return src; }
}

export function wallpaperPatch(layout: AppearanceLayout, item: CatalogWallpaper): Partial<AppearanceProfile> {
  const media = { wallpaperType: "video" as const, wallpaperPoster: item.image, wallpaperPlayback: true, artwork: true };
  return ["sony", "series", "wii", "neutral"].includes(layout)
    ? { ...media, consoleCustomBg: item.video, consoleBg: "custom" }
    : { ...media, customBg: item.video };
}

export function filterWallpapers(items: CatalogWallpaper[], query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item => words.every(word => `${item.title} ${item.resolution}`.toLowerCase().includes(word)));
}