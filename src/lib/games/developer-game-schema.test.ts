import { describe, expect, it } from "vitest";
import { developerGameSchema, normalizeGameUrl, requireDeveloper } from "./developer-game-schema";
import { cloudRelayUrl } from "./cloud-relay";
describe("developer-added games", () => {
  it("normalizes a cloud URL without a scheme", () => { expect(developerGameSchema.parse({ name: "XO Beta", kind: "cloud", url: "xo-beta-full.vercel.app" })).toEqual({ name: "XO Beta", kind: "cloud", url: "https://xo-beta-full.vercel.app/" }); });
  it("preserves arcade paths and parameters", () => { expect(developerGameSchema.parse({ name: "Arcade", kind: "arcade", url: "https://example.com/play?mode=1" }).url).toBe("https://example.com/play?mode=1"); });
  it("rejects unknown game sections", () => { expect(() => developerGameSchema.parse({ name: "Game", kind: "web", url: "https://example.com" })).toThrow(); });
  it("denies game management to non-developers", () => { expect(() => requireDeveloper(false)).toThrow("Developer access only"); expect(() => requireDeveloper(null)).toThrow(); expect(() => requireDeveloper(true)).not.toThrow(); });
  it("rejects unsafe game addresses", () => { for (const url of ["javascript:alert(1)", "http://example.com", "https://127.0.0.1", "https://localhost", "https://admin:pass@example.com", "https://service.internal"]) expect(() => normalizeGameUrl(url)).toThrow(); });
  it("keeps uncatalogued cloud games on the full proxy fallback", () => { expect(cloudRelayUrl("https://new-game.example.com/")).toBeNull(); });
});