import { describe, it, expect } from "vitest";
import { modsFor, mapReaderFor } from "./mods";
describe("Retro Bowl College mods", () => {
  it("has every regular Retro Bowl mod", () => {
    expect(modsFor("Retro Bowl College").map((m) => m.id)).toEqual(modsFor("Retro Bowl").map((m) => m.id));
    expect(modsFor("Retro Bowl College").find((m) => m.id === "credits")?.value).toBe(99999);
    expect(mapReaderFor("Retro Bowl College")?.fn).toBe("ds_map_find_value");
  });
});
