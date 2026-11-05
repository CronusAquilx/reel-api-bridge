import { describe, expect, it } from "vitest";
import { APPS, CATALOG, fromArcade, launchPath } from "./catalog";
import { statusOf } from "@/components/console/shared";
import { resolvePopupTarget } from "@/lib/astra/proxy-popups";

const EMPTY = { installed: [], wishlist: [], lastPlayed: null, progress: {} };

describe("Console media apps", () => {
  it("offers YouTube, Netflix, Hulu and Paramount+ in the app store", () => {
    expect(APPS.filter(a => a.installable).map(a => a.title)).toEqual(["YouTube", "Netflix", "Hulu", "Paramount+"]);
  });
  it("requires streaming apps to be downloaded before opening", () => {
    const netflix = APPS.find(a => a.id === "app-netflix")!;
    expect(statusOf(netflix, EMPTY)).toBe("Get");
    expect(statusOf(netflix, { ...EMPTY, installed: ["app-netflix"] })).toBe("Installed");
    expect(launchPath(netflix)).toBe("/console/stream/netflix");
  });
  it("keeps the existing Movies app always ready", () => {
    expect(statusOf(APPS.find(a => a.id === "app-movies")!, EMPTY)).toBe("Ready to open");
  });
});

describe("Game thumbnails", () => {
  it("uses the arcade source's own cover image", () => {
    expect(fromArcade({ id: 0, name: "Bowmasters", author: "", file: "0.html", cover: "0.png" }).cover).toBe("/api/public/games/cover/0.png");
  });
  it("gives every cloud game a thumbnail of its own site", () => {
    const one = CATALOG.find(g => g.url === "https://krunker.io/")!;
    expect(one.cover).toContain("https://krunker.io/");
  });
});

describe("Proxied sign-in popups", () => {
  it("resolves relative and already-proxied popup addresses to the real site", () => {
    expect(resolvePopupTarget("/__/auth/handler?x=1", "https://1v1.lol/game")).toBe("https://1v1.lol/__/auth/handler?x=1");
    expect(resolvePopupTarget("/scramjet/p/https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2", "https://1v1.lol/")).toBe("https://accounts.google.com/o/oauth2");
    expect(resolvePopupTarget("javascript:alert(1)", "https://1v1.lol/")).toBeNull();
  });
});
