import { describe, expect, it, vi } from "vitest";
describe("Legacy desktop migration", () => {
  it("moves Classic to Windows and retains its custom wallpaper", async () => {
    localStorage.setItem("astra-prefs", JSON.stringify({ layout:"classic", console:"off", appearances:{classic:{customBg:"https://example.org/classic.gif"}} }));
    vi.resetModules();
    const { setPrefs } = await import("./prefs");
    setPrefs({ focus:"all" });
    const saved = JSON.parse(localStorage.getItem("astra-prefs") || "{}");
    expect(saved.layout).toBe("windows");
    expect(saved.appearances.windows.customBg).toBe("https://example.org/classic.gif");
    localStorage.removeItem("astra-prefs");
  });
});