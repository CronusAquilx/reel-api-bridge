import { describe, expect, it } from "vitest";
import { APPS, CATALOG, fromArcade, launchPath } from "./catalog";
import { CLOUD_GAMES } from "../games/cloud-catalog";

describe("Console real catalog", () => {
  it("includes every existing cloud game without changing its address", () => {
    expect(CATALOG.length).toBe(CLOUD_GAMES.length);
    for (const game of CLOUD_GAMES) expect(CATALOG.find(g => g.url === game.url && g.title === game.name)?.title).toBe(game.name);
  });
  it("keeps Cloud launches in the standalone player", () => {
    const gta = CATALOG.find(g => g.url === "https://fiveplay.lol/");
    expect(gta).toBeDefined();
    if (!gta) throw new Error("Missing GTA");
    expect(launchPath(gta)).toBe("/play?url=https%3A%2F%2Ffiveplay.lol%2F&name=Grand%20Theft%20Auto%20V");
  });
  it("routes regular games to the existing arcade player by stable file ID", () => {
    const arcade = fromArcade({id: 0, name: "Bowmasters", author: "Azur Games", file: "0-fix2.html", cover: "0.png"});
    expect(arcade.id).toBe("arcade:0-fix2.html");
    expect(launchPath(arcade)).toBe("/console/arcade?game=0-fix2.html");
  });
  it("connects Music, Movies and AI to their existing screens", () => {
    expect(APPS.slice(0,3).map(launchPath)).toEqual(["/music", "/movies", "/chat"]);
  });
  it("keeps developer arcade URLs on the inline arcade player", () => {
    const game = fromArcade({ id: -1, name: "Custom arcade", author: "", file: "custom:123", cover: "", url: "https://example.com/play" });
    expect(game.url).toBe("https://example.com/play");
    expect(launchPath(game)).toBe("/console/arcade?game=custom%3A123");
  });
});