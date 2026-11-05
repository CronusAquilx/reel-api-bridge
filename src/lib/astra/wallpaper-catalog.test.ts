import { describe, expect, it } from "vitest";
import { VISIBLE_LAYOUTS, initialAppearance, updateAppearance } from "./appearance";
import { DEFAULT_PREFS } from "./prefs";
import { filterWallpapers, wallpaperCategories, wallpaperPatch, upgradeWallpaperSource, type CatalogWallpaper } from "./wallpaper-catalog";

const item: CatalogWallpaper = { id: "lake", title: "Dreamy Landscape", source: "https://www.desktophut.com/lake", video: "/loop.mp4", image: "/lake.jpg", resolution: "3840x2160" };
describe("shared live wallpaper catalog", () => {
  it("upgrades existing preview selections without changing custom videos", () => {
    const upgrades = { "/loop.mp4": "/original-4k.mp4" };
    expect(upgradeWallpaperSource("/loop.mp4", upgrades)).toBe("/original-4k.mp4");
    expect(upgradeWallpaperSource("/custom.mp4", upgrades)).toBe("/custom.mp4");
  });
  it("upgrades absolute saved asset URLs and cache-busted preview URLs", () => {
    const upgrades = { "/__l5e/assets-v1/old/preview.mp4": "/original-4k.mp4" };
    expect(upgradeWallpaperSource("https://example.org/__l5e/assets-v1/old/preview.mp4?v=1", upgrades)).toBe("/original-4k.mp4");
    expect(upgradeWallpaperSource("/__l5e/assets-v1/old/preview.mp4?v=1", upgrades)).toBe("/original-4k.mp4");
  });
  it.each(VISIBLE_LAYOUTS)("applies a video to %s without changing another layout", layout => {
    const current = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ classic: current }, layout, current, wallpaperPatch(layout, item));
    expect(saved[layout]?.wallpaperType).toBe("video");
    expect(saved[layout]?.wallpaperPlayback).toBe(true);
    expect(saved[layout]?.wallpaperPoster).toBe("/lake.jpg");
    expect(["sony", "series", "wii", "neutral"].includes(layout) ? saved[layout]?.consoleCustomBg : saved[layout]?.customBg).toBe("/loop.mp4");
    expect(saved.classic?.customBg).toBe(current.customBg);
  });
  it("searches titles and resolutions without case sensitivity", () => {
    expect(filterWallpapers([item], "DREAMY 3840")).toEqual([item]);
    expect(filterWallpapers([item], "naruto")).toEqual([]);
  });
  it("finds a specific wallpaper across punctuation and accents", () => {
    const specific = { ...item, title: "Pokémon: Starry-Sky" };
    expect(filterWallpapers([specific, item], "POKEMON starry sky")).toEqual([specific]);
    expect(filterWallpapers([specific, item], "pokemon ocean")).toEqual([]);
  });
  it("combines genres with title searches instead of ignoring either filter", () => {
    const anime = { ...item, id: "gojo", title: "Gojo Satoru Starlit Sky" };
    const car = { ...item, id: "porsche", title: "Porsche 911 GT3 RS" };
    expect(filterWallpapers([anime, car], "gojo", "Anime")).toEqual([anime]);
    expect(filterWallpapers([anime, car], "gojo", "Cars")).toEqual([]);
    expect(filterWallpapers([anime, car], "", "Cars")).toEqual([car]);
  });
  it("keeps source genres and allows a wallpaper in multiple categories", () => {
    const mixed = { ...item, title: "Cozy Mountain Cabin", categories: ["Fantasy" as const] };
    expect(wallpaperCategories(mixed)).toEqual(expect.arrayContaining(["Nature", "Cozy", "Fantasy"]));
    expect(filterWallpapers([mixed], "cozy", "Nature")).toEqual([mixed]);
  });
});