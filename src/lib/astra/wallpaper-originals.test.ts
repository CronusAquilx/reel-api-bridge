import { describe, expect, it } from "vitest";
import manifest from "@/assets/wallpapers/native/manifest.json";
import { DESKTOPHUT_WALLPAPERS } from "./desktophut-wallpapers";
import { WALLPAPER_ORIGINALS, WALLPAPER_VIDEO_UPGRADES } from "./wallpaper-originals";
import { upgradeWallpaperSource } from "./wallpaper-catalog";

describe("completed native wallpaper imports", () => {
  it("connects all 985 available originals without discarding the two unavailable previews", () => {
    expect(DESKTOPHUT_WALLPAPERS).toHaveLength(987);
    expect(Object.keys(WALLPAPER_ORIGINALS)).toHaveLength(985);
    expect(DESKTOPHUT_WALLPAPERS.filter(item => item.originalQuality)).toHaveLength(985);
    expect(DESKTOPHUT_WALLPAPERS.find(item => item.id === "dh-nier-automata-2b-winter-night-mkwf")?.originalQuality).toBe(false);
  });
  it("uses native dimensions and original posters for expanded catalog entries", () => {
    const item = DESKTOPHUT_WALLPAPERS.find(item => item.id === "dh-yelan-4k-live-wallpaper");
    expect(item?.resolution).toBe("3840x2160");
    expect(item?.video).toBe(WALLPAPER_ORIGINALS["dh-yelan-4k-live-wallpaper"]?.video);
    expect(item?.image).toBe(WALLPAPER_ORIGINALS["dh-yelan-4k-live-wallpaper"]?.image);
  });
  it("upgrades saved previews from both collections without changing custom uploads", () => {
    for (const item of manifest) {
      const original = WALLPAPER_ORIGINALS[item.id];
      if (!original) continue;
      expect(upgradeWallpaperSource(item.video, WALLPAPER_VIDEO_UPGRADES)).toBe(original.video);
    }
    expect(upgradeWallpaperSource("blob:my-custom-wallpaper", WALLPAPER_VIDEO_UPGRADES)).toBe("blob:my-custom-wallpaper");
  });
});