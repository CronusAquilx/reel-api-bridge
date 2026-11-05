import { describe, expect, it } from "vitest";
import { formatBytes, fpsRating, frameStats, pingAvg } from "./perf-monitor";

describe("frameStats", () => {
  it("computes 60 fps from steady 16.67 ms frames", () => {
    const stats = frameStats(Array(120).fill(1000 / 60));
    expect(stats.fps).toBeCloseTo(60, 0);
    expect(stats.avgMs).toBeCloseTo(16.67, 1);
  });
  it("reports the slowest 1% of frames as the 1% low", () => {
    const deltas = [...Array(99).fill(1000 / 60), 100];
    expect(frameStats(deltas).lowMs).toBe(100);
  });
  it("returns zeros for no samples and ignores broken samples", () => {
    expect(frameStats([])).toEqual({ fps: 0, avgMs: 0, lowMs: 0 });
    expect(frameStats([0, -5, 5000])).toEqual({ fps: 0, avgMs: 0, lowMs: 0 });
  });
});

describe("pingAvg", () => {
  it("averages recent round trips", () => {
    expect(pingAvg([40, 60, 80])).toBe(60);
  });
  it("is null when no ping succeeded", () => {
    expect(pingAvg([])).toBeNull();
  });
});

describe("formatBytes", () => {
  it("formats megabytes", () => {
    expect(formatBytes(50 * 1024 * 1024)).toBe("50 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
  it("formats small sizes as kilobytes and rejects garbage", () => {
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("fpsRating", () => {
  it("rates 60 good, 40 ok, and 20 bad", () => {
    expect(fpsRating(60)).toBe("good");
    expect(fpsRating(40)).toBe("ok");
    expect(fpsRating(20)).toBe("bad");
  });
});
