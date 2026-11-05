import { expect, it } from "vitest";
import { mergeShortcut, type DesktopShortcut } from "./desktop-shortcuts";
it("adding the same movie shortcut twice keeps one stable desktop entry", () => {
  const movie: DesktopShortcut = { id: "movie:movie:10", kind: "movie", title: "Movie", tmdbId: 10, mediaType: "movie" };
  expect(mergeShortcut(mergeShortcut([], movie), movie)).toHaveLength(1);
});