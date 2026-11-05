/** Qaisify catalog identifiers are namespaced so existing Birch playlists remain valid. */
export const QAISIFY_ROWS = [
  { title: "🔥 Hip-Hop & Rap", term: "hip hop rap" },
  { title: "🎤 R&B & Soul", term: "rnb soul" },
  { title: "🎵 Top Pop Hits", term: "pop hits" },
  { title: "🌍 Afrobeats", term: "afrobeats" },
  { title: "⚡ Electronic & EDM", term: "electronic edm" },
  { title: "😴 Lo-Fi & Chill", term: "lofi chill beats" },
  { title: "💪 Workout Bangers", term: "workout gym music" },
  { title: "🌙 Late Night R&B", term: "late night rnb" },
  { title: "🎸 Rock", term: "rock" },
  { title: "🌎 Latin & Reggaeton", term: "reggaeton latin" },
];

export function qaisifyTrack(t: Record<string, any>) {
  return { id: `itunes:${t["trackId"]}`, title: t["trackName"] ?? "", artist: t["artistName"] ?? "", artistId: `itunes:${t["artistId"]}`,
    album: t["collectionName"] ?? "", albumId: `itunes:${t["collectionId"]}`, art: String(t["artworkUrl100"] ?? "").replace(/\d+x\d+bb/, "600x600bb"),
    duration: Math.round(Number(t["trackTimeMillis"] ?? 0) / 1000), source: "itunes" as const };
}

export function playableVideoIds(ids: string[], videos: Record<string, any>[]) {
  const playable = new Set(videos.filter(v => v["status"]?.embeddable === true && v["status"]?.privacyStatus === "public"
    && (!v["status"].uploadStatus || v["status"].uploadStatus === "processed")
    && !v["contentDetails"]?.regionRestriction?.blocked?.includes("US")
    && (!v["contentDetails"]?.regionRestriction?.allowed || v["contentDetails"].regionRestriction.allowed.includes("US")))
    .map(v => v["id"]));
  return [...new Set(ids)].filter(id => /^[\w-]{11}$/.test(id) && playable.has(id)).slice(0, 5);
}

export function nextQueueIndex(cur: number, count: number, repeat: "off" | "all" | "one", shuffle: boolean, random = Math.random()) {
  if (count === 0) return -1;
  if (repeat === "one") return cur;
  if (shuffle && count > 1) return (cur + 1 + Math.floor(random * (count - 1))) % count;
  if (cur + 1 < count) return cur + 1;
  return repeat === "all" ? 0 : -1;
}