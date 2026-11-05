import { describe, expect, it } from "vitest";
import { moveGrid, moveShelf } from "./nav";
import { DEFAULT_PREFS } from "../astra/prefs";
import { resolveSkin } from "./skins";

describe("Console input rules", () => {
  it("moves with arrows without wrapping grid edges", () => {
    expect(moveGrid(0, 12, 5, "right")).toBe(1);
    expect(moveGrid(4, 12, 5, "right")).toBe(4);
    expect(moveGrid(0, 12, 5, "down")).toBe(5);
    expect(moveGrid(10, 12, 5, "down")).toBe(10);
  });
  it("skips empty shelves and clamps the column", () => {
    expect(moveShelf({ r: 0, c: 3 }, [4, 0, 2], "down")).toEqual({ r: 2, c: 1 });
  });
  it("keeps classic layout and console off by default with Sony fallback", () => {
    expect(DEFAULT_PREFS.layout).toBe("windows");
    expect(DEFAULT_PREFS.console).toBe("off");
    expect(resolveSkin("off")).toBe("sony");
    expect(resolveSkin("series")).toBe("series");
  });
});