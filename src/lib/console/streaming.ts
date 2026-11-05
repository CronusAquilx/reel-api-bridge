/** Streaming apps available in the console store (they open their real sites through the proxy). */
export const STREAMING_APPS = [
  { slug: "youtube", title: "YouTube", tagline: "Videos, music and live streams.", hue: 25, url: "https://www.youtube.com/" },
  { slug: "netflix", title: "Netflix", tagline: "Series and films on demand.", hue: 20, url: "https://www.netflix.com/" },
  { slug: "hulu", title: "Hulu", tagline: "Current TV and originals.", hue: 150, url: "https://www.hulu.com/" },
  { slug: "paramount", title: "Paramount+", tagline: "Movies, shows and live sports.", hue: 245, url: "https://www.paramountplus.com/" },
] as const;
export type StreamingSlug = (typeof STREAMING_APPS)[number]["slug"];
export const streamingApp = (slug: string) => STREAMING_APPS.find((a) => a.slug === slug);
