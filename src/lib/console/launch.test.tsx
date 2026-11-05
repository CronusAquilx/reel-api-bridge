import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitProvider, useVisit } from "./visit";
import { APPS, fromArcade } from "./catalog";
import { actOn } from "./store";

describe("Console launches retain visit confirmation", () => {
  it("keeps the confirmed visit ready while media and installed arcade destinations change", () => {
    const { result } = renderHook(() => useVisit(), { wrapper: VisitProvider });
    act(() => result.current.send("choices-complete"));
    act(() => result.current.send("account-confirmed"));
    const arcade = fromArcade({ id: 1, name: "OvO", author: "", file: "ovo.html", cover: "" });
    const destinations: string[] = [];
    const lib = { installed: [arcade.id], wishlist: [], lastPlayed: null, progress: {} };
    for (const game of [...APPS.slice(0, 3), arcade]) {
      act(() => actOn(game, lib, path => destinations.push(path)));
      expect(result.current.stage).toBe("ready");
    }
    expect(destinations).toEqual(["/music", "/movies", "/chat", "/console/arcade?game=ovo.html"]);
  });
});