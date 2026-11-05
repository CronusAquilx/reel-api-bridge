import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleScreen } from "./ConsoleScreen";
const mocks = vi.hoisted(() => ({ skin: "series", xbox: vi.fn((_props: { screen: string }) => null), sony: vi.fn(() => null) }));
const reference = vi.hoisted(() => vi.fn((_props: { screen: string; skin: string }) => null));
vi.mock("./ReferenceScreen", () => ({ ReferenceScreen: reference }));
vi.mock("@/lib/astra/prefs", () => ({ usePrefs: () => ({ console: mocks.skin }) }));
vi.mock("./xbox/XboxScreen", () => ({ XboxScreen: mocks.xbox }));
vi.mock("./sony/SonyHome", () => ({ SonyHome: mocks.sony }));
vi.mock("./sony/SonyStore", () => ({ SonyStore: () => null }));
vi.mock("./sony/SonyLibrary", () => ({ SonyLibrary: () => null }));
vi.mock("./sony/SonySettings", () => ({ SonySettings: () => null }));
vi.mock("./sony/SonyProfile", () => ({ SonyProfile: () => null }));
afterEach(() => { cleanup(); mocks.xbox.mockClear(); mocks.sony.mockClear(); reference.mockClear(); });
describe("console skin routing", () => {
  it("uses Xbox Series X for every game and media screen when series is selected", () => {
    mocks.skin = "series";
    for (const screen of ["home", "store", "library", "apps", "media"] as const) {
      render(<ConsoleScreen screen={screen}/>);
      expect(reference.mock.calls.at(-1)?.[0]).toEqual({ screen, skin: "series" });
    }
    expect(mocks.sony).not.toHaveBeenCalled();
  });
  it("uses the PS5 reference screen for Sony home", () => {
    mocks.skin = "sony";
    render(<ConsoleScreen screen="home"/>);
    expect(reference.mock.calls.at(-1)?.[0]).toEqual({ screen: "home", skin: "sony" });
    expect(mocks.xbox).not.toHaveBeenCalled();
  });
  it.each(["wii", "neutral"])("uses %s for shared console content screens", skin => {
    mocks.skin = skin;
    for (const screen of ["home", "media", "store", "library", "apps"] as const) {
      render(<ConsoleScreen screen={screen}/>);
      expect(reference.mock.calls.at(-1)?.[0]).toEqual({ screen, skin });
    }
  });
});