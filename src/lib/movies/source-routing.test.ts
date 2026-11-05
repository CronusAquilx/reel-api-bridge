import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({}) } } }));
import { STREAMING_SERVERS } from "./tmdb";
import { anikotoSearchUrl, animeIcuVoiceUrl, animeVoiceUrl } from "./anime-sources";

describe("imported movie source routing", () => {
  it("lists all twenty external sources, eight under New Sources", () => {
    expect(STREAMING_SERVERS).toHaveLength(20);
    expect(new Set(STREAMING_SERVERS.map(source => source.id)).size).toBe(20);
    expect(STREAMING_SERVERS.filter(source => source.category === "sources")).toHaveLength(8);
    for (const source of STREAMING_SERVERS) {
      expect(new URL(source.url(550, "movie")).protocol).toBe("https:");
      expect(source.url(550, "movie")).not.toContain("movie-unavailable");
    }
  });
  it("retains movie and episode identifiers in provider routes", () => {
    const source = STREAMING_SERVERS.find(item => item.id === "vidsrccc");
    expect(source?.url(550, "movie")).toBe("https://vidsrc.cc/v2/embed/movie/550");
    expect(source?.url(1399, "tv", 2, 3)).toBe("https://vidsrc.cc/v2/embed/tv/1399/2/3");
  });
  it("keeps anime source identifiers and dubbed voice choices separate", () => {
    expect(animeVoiceUrl(21, 4, "en")).toBe("https://vidlink.pro/anime/21/4/dub");
    expect(animeIcuVoiceUrl(21, 4, "ja")).toBe("https://vidsrc.icu/embed/anime/21/4/0");
    expect(new URL(anikotoSearchUrl("One Piece")).searchParams.get("s")).toBe("One Piece");
  });
});