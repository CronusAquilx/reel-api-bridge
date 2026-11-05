import { describe, expect, it } from "vitest";
import { shouldPlayWallpaper } from "./wallpaper-playback";
const limited = { hidden: false, playback: undefined, reduceMotion: true, performance: true, systemReducedMotion: true };
describe("live wallpaper playback", () => {
  it("plays an explicitly equipped video despite motion limits", () => {
    expect(shouldPlayWallpaper({ ...limited, playback: true })).toBe(true);
  });
  it("keeps default motion limits until explicitly enabled", () => {
    expect(shouldPlayWallpaper(limited)).toBe(false);
  });
  it("pauses when animation is switched off", () => {
    expect(shouldPlayWallpaper({ ...limited, reduceMotion: false, performance: false, systemReducedMotion: false, playback: false })).toBe(false);
  });
  it("pauses hidden tabs even when animation is enabled", () => {
    expect(shouldPlayWallpaper({ ...limited, hidden: true, playback: true })).toBe(false);
  });
});