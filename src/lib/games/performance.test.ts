import { describe, expect, it } from "vitest";
import { gameRelayUrl } from "./performance";

describe("verified game performance profiles", () => {
  it("uses FivePlay's lower-resolution and lower-detail controls", () => {
    const result = new URL(gameRelayUrl("https://fiveplay.lol/?trace=1&newgame=1", "performance") || "", "https://app.test");
    expect(result.searchParams.get("scale")).toBe("0.75");
    expect(result.searchParams.get("low")).toBe("1");
    expect(result.searchParams.get("fps")).toBe("60");
    expect(result.searchParams.has("trace")).toBe(false);
    expect(result.searchParams.get("newgame")).toBe("1");
  });
  it("retains original settings for native quality", () => {
    expect(gameRelayUrl("https://fiveplay.lol/?scale=1&fps=30", "native")).toBe("/api/public/fp/?scale=1&fps=30");
  });
  it("does not invent graphics controls for other games", () => {
    expect(gameRelayUrl("https://play.geforcenow.com/", "performance")).toBeNull();
    expect(gameRelayUrl("https://fiveplay.lol.attacker.test/", "performance")).toBeNull();
  });
  it("uses moderate resolution without forcing low detail in balanced mode", () => {
    expect(gameRelayUrl("https://fiveplay.lol/", "balanced")).toBe("/api/public/fp/?scale=0.85&fps=60");
  });
});