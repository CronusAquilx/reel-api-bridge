import { describe, expect, it } from "vitest";
import { nextQueueIndex, playableVideoIds, qaisifyTrack } from "./qaisify";

describe("old Qaisify catalog and playback compatibility", () => {
  it("preserves The Box's original artist, catalog identity and duration", () => {
    expect(qaisifyTrack({ trackId: 1, trackName: "The Box", artistName: "Roddy Ricch", artistId: 2, collectionId: 3, trackTimeMillis: 196000 }).artist).toBe("Roddy Ricch");
    expect(qaisifyTrack({ trackId: 1, trackTimeMillis: 196000 }).id).toBe("itunes:1");
    expect(qaisifyTrack({ trackId: 1, trackTimeMillis: 196000 }).duration).toBe(196);
  });
  it("tries only public, processed, embeddable US-available videos", () => {
    const valid = { status: { embeddable: true, privacyStatus: "public", uploadStatus: "processed" } };
    expect(playableVideoIds(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc", "ddddddddddd"], [
      { id: "aaaaaaaaaaa", ...valid }, { id: "bbbbbbbbbbb", status: { ...valid.status, embeddable: false } },
      { id: "ccccccccccc", ...valid, contentDetails: { regionRestriction: { blocked: ["US"] } } },
      { id: "ddddddddddd", status: { ...valid.status, privacyStatus: "private" } },
    ])).toEqual(["aaaaaaaaaaa"]);
  });
  it("ends queues normally and supports repeat all and one", () => {
    expect(nextQueueIndex(2, 3, "off", false)).toBe(-1);
    expect(nextQueueIndex(2, 3, "all", false)).toBe(0);
    expect(nextQueueIndex(2, 3, "one", false)).toBe(2);
  });
  it("shuffle does not immediately repeat the current song", () => {
    expect(nextQueueIndex(1, 3, "off", true, 0)).toBe(2);
    expect(nextQueueIndex(1, 3, "off", true, 0.99)).toBe(0);
  });
});