import { describe, expect, it } from "vitest";
import { notesKey, weatherLabel } from "./desktop-widgets";
describe("desktop widgets", () => {
  it("keeps notes isolated by account", () => { expect(notesKey("qais")).not.toBe(notesKey("chance")); });
  it("maps live weather conditions", () => { expect(weatherLabel(0)).toBe("Clear sky"); expect(weatherLabel(61)).toBe("Rain"); expect(weatherLabel(71)).toBe("Snow"); });
});