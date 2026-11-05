import { describe, it, expect } from "vitest";
import { handleSchema, safeSocialLink, socialInput } from "./rules";
describe("social safety", () => {
  it("normalizes player handles without exposing email addresses", () => { expect(handleSchema.parse("  Player_7 ")).toBe("player_7"); expect(handleSchema.safeParse("user@example.com").success).toBe(false); });
  it("only shares same-app games and media destinations", () => { expect(safeSocialLink("/movies/title/movie/123")).toBe(true); expect(safeSocialLink("/console/store?game=test")).toBe(true); expect(safeSocialLink("//evil.test")).toBe(false); expect(safeSocialLink("/console\\evil.test")).toBe(false); expect(safeSocialLink("https://evil.test")).toBe(false); });
  it("rejects unsupported privileged actions", () => { expect(socialInput.safeParse({action:"promote",payload:{}}).success).toBe(false); });
});