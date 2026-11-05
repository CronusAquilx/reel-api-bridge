import { useEffect } from "react";

export type GameQuality = "performance" | "balanced" | "native";

/** Only FivePlay has verified native graphics query controls. */
export function gameRelayUrl(url: string, quality: GameQuality): string | null {
  let source: URL;
  try { source = new URL(url); } catch { return null; }
  if (!["fiveplay.lol", "www.fiveplay.lol", "gta.deloskiyt.pl"].includes(source.hostname)) return null;
  const search = new URLSearchParams(source.search);
  if (quality !== "native") {
    search.set("scale", quality === "performance" ? "0.75" : "0.85");
    if (quality === "performance") search.set("low", "1");
    search.set("fps", "60");
    for (const key of ["verbose", "trace", "log", "console", "shot", "record"]) search.delete(key);
  }
  const path = source.hostname === "gta.deloskiyt.pl" ? "/" : source.pathname;
  return `/api/public/fp${path}${search.size ? `?${search}` : ""}`;
}

/** Temporarily disable the app's decorative work, without changing saved preferences. */
export function useGameplayPerformance(active = true) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const alreadyLight = root.classList.contains("perf-lite");
    root.classList.add("perf-lite");
    return () => {
      let preferred = false;
      try { preferred = !!JSON.parse(localStorage.getItem("astra-prefs") || "{}").perfMode; } catch { /* leave defaults */ }
      if (!alreadyLight && !preferred) root.classList.remove("perf-lite");
    };
  }, [active]);
}