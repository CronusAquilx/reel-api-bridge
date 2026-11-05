import { describe, expect, it } from "vitest";
import { activeLayout, initialAppearance, updateAppearance } from "./appearance";
import { DEFAULT_PREFS } from "./prefs";

describe("layout personalization", () => {
  it("keeps live wallpapers separate for each desktop layout", () => {
    const original = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ windows: original, classic: original }, "windows", original, { liveWallpaper: "water" });
    expect(saved.windows?.liveWallpaper).toBe("water");
    expect(saved.classic?.liveWallpaper).toBe("off");
  });
  it("keeps the clock font separate for each desktop layout", () => {
    const original = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ windows: original, launcher: original }, "windows", original, { clockFont: "digital" });
    expect(saved.windows?.clockFont).toBe("digital");
    expect(saved.launcher?.clockFont).toBe("clean");
  });
  it("keeps animated wallpapers independent between Windows, PS5 and Xbox", () => {
    const original = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ windows: original, sony: original, series: original }, "windows", original, { wallpaperMotion: "drift", particles: "stars", particleDensity: "rich", appTransparency: "glass" });
    expect(saved.windows?.wallpaperMotion).toBe("drift");
    expect(saved.windows?.particles).toBe("stars");
    expect(saved.sony?.wallpaperMotion).toBe("off");
    expect(saved.series?.particles).toBe("off");
  });
  it("keeps PlayStation and Xbox accents separate", () => {
    const original = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ sony: original, series: original }, "sony", original, { accent: "rose" });
    expect(saved.sony?.accent).toBe("rose");
    expect(saved.series?.accent).toBe("star");
  });
  it("keeps Classic and Launcher themes separate", () => {
    const original = initialAppearance(DEFAULT_PREFS);
    const saved = updateAppearance({ classic: original, launcher: original }, "launcher", original, { mode: "light", palette: "arctic" });
    expect(saved.launcher?.mode).toBe("light");
    expect(saved.launcher?.palette).toBe("arctic");
    expect(saved.classic?.mode).toBe("dark");
  });
  it("selects each active layout's own appearance", () => {
    expect(activeLayout({ console: "sony", layout: "classic" })).toBe("sony");
    expect(activeLayout({ console: "series", layout: "launcher" })).toBe("series");
    expect(activeLayout({ console: "off", layout: "classic" })).toBe("classic");
    expect(activeLayout({ console: "off", layout: "launcher" })).toBe("launcher");
  });
});