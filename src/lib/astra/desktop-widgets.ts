export function notesKey(userId: string) { return `birch-desktop-note:${userId}`; }
export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "Rain";
  if (code <= 77 || code === 85 || code === 86) return "Snow";
  return "Thunderstorms";
}