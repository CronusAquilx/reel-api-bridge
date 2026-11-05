import { describe, expect, it } from "vitest";
import { CLOUD_GAMES } from "./cloud-catalog";
import { cloudRelayUrl } from "./cloud-relay";

describe("Rift Arena cloud game", () => {
  it("adds XO Beta to cloud games with the shared relay", () => {
    expect(CLOUD_GAMES.find(g => g.url === "https://xo-beta-full.vercel.app/")?.name).toBe("XO Beta");
    expect(cloudRelayUrl("https://xo-beta-full.vercel.app/")).toBe("/api/public/cg/https/xo-beta-full.vercel.app/");
  });
  it("includes the requested game using the shared cloud relay", () => {
    const url = "https://rift-arena-eight.vercel.app/";
    expect(CLOUD_GAMES.filter(game => game.url === url)).toEqual([{ name: "Rift Arena", url }]);
    expect(cloudRelayUrl(url)).toBe("/api/public/cg/https/rift-arena-eight.vercel.app/");
  });
});

describe("Fortnite browser options", () => {
  it("includes EMX Freebuild as a separate proxied browser simulator", () => {
    const url = "https://freebuild.emxtweaks.com/";
    expect(CLOUD_GAMES.find(game => game.url === url)?.name).toBe("EMX Freebuild (browser simulator)");
    expect(cloudRelayUrl(url)).toBe("/api/public/cg/https/freebuild.emxtweaks.com/");
  });
  it("includes the requested Retrora domain separately from official Fortnite", () => {
    expect(CLOUD_GAMES.find(game => game.url === "https://retrora.lol/")?.name).toBe("Fortnite Season 1 — Retrora (community port)");
  });
  it("offers the official Fortnite Xbox launch through the full proxy", () => {
    const url = "https://www.xbox.com/play/games/fortnite/BT5P2X999VH2";
    expect(CLOUD_GAMES.find(game => game.url === url)?.name).toBe("Fortnite — Xbox Cloud (official)");
    expect(cloudRelayUrl(url)).toBeNull();
  });
});