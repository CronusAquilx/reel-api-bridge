import { describe, expect, it } from "vitest";
import { catalogSearch } from "./catalog";
describe("music catalog resilience", () => {
  it("keeps OWA OWA when optional lookups fail", async () => {
    const song = { title: "OWA OWA", artist: "Lil Tecca" };
    const result = await catalogSearch(async () => [song], async () => { throw new Error("timeout"); }, async () => { throw new Error("timeout"); }, async () => []);
    expect(result.tracks).toEqual([song]);
  });
  it("uses secondary songs when the primary catalog fails", async () => {
    const result = await catalogSearch(async () => { throw new Error("unavailable"); }, async () => [], async () => [], async () => [{ title: "OWA OWA", artist: "Lil Tecca" }]);
    expect(result.tracks[0]?.title).toBe("OWA OWA");
  });
});