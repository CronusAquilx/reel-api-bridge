// DOM-free core for the in-game performance overlay; the React overlay lives in
// src/components/games/PerfOverlay.tsx.

export type FrameStats = { fps: number; avgMs: number; lowMs: number };

/** Reduce raw frame-time deltas (ms between frames) into fps / average / 1% low. */
export function frameStats(deltas: number[]): FrameStats {
  const clean = deltas.filter((d) => d > 0 && d < 1000);
  if (!clean.length) return { fps: 0, avgMs: 0, lowMs: 0 };
  const avg = clean.reduce((s, d) => s + d, 0) / clean.length;
  const sorted = [...clean].sort((a, b) => a - b);
  // 1% low: the frame time at the 99th percentile (the slowest frames).
  const low = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? avg;
  return { fps: avg > 0 ? 1000 / avg : 0, avgMs: avg, lowMs: low };
}

/** Average round-trip time of recent ping samples, or null when none succeeded. */
export function pingAvg(samples: number[]): number | null {
  const clean = samples.filter((s) => s >= 0 && Number.isFinite(s));
  if (!clean.length) return null;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

/** Human-readable heap size, e.g. 50 MiB -> "50 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Qualitative rating used to color the fps readout. */
export function fpsRating(fps: number): "good" | "ok" | "bad" {
  if (fps >= 50) return "good";
  if (fps >= 30) return "ok";
  return "bad";
}
