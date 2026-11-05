import { describe, expect, it } from "vitest";
import { newWidget, widgetBounds } from "./widget-layout";
import { VISIBLE_LAYOUTS } from "./appearance";
describe("Unified desktop", () => {
  it("offers Windows once with no Classic or Launcher choices", () => {
    expect(VISIBLE_LAYOUTS.filter(v => v === "windows")).toHaveLength(1);
    expect(VISIBLE_LAYOUTS).not.toContain("classic");
    expect(VISIBLE_LAYOUTS).not.toContain("launcher");
  });
  it("keeps dragged and resized widgets within the desktop", () => {
    const result = widgetBounds({...newWidget("notes","note",0), x:900,y:600,width:300,height:240},1020,450);
    expect(result.x).toBe(720); expect(result.y).toBe(210);
    expect(result.width).toBe(300); expect(result.height).toBe(240);
  });
});