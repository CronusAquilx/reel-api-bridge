export type AnimeMatch = { id: number; anilistId?: number; title: string; episodes: number | null };

export function supportsAnimationSources(detail: { genres?: { id: number }[]; genre_ids?: number[] } | undefined): boolean {
  return Boolean(detail?.genres?.some(genre => genre.id === 16) || detail?.genre_ids?.includes(16));
}

/** Anikoto's actual site search, not an invented embed/audio API. */
export function anikotoSearchUrl(title: string): string {
  const url = new URL('https://anikoto.com.co/');
  url.searchParams.set('s', title.trim());
  return url.toString();
}

/** VidLink's documented anime API uses MAL IDs, not TMDB IDs. No fallback to sub. */
export function animeVoiceUrl(malId: number, episode: number, voice: 'en' | 'ja'): string {
  return `https://vidlink.pro/anime/${malId}/${episode}/${voice === 'en' ? 'dub' : 'sub'}`;
}

export function animeIcuVoiceUrl(anilistId: number, episode: number, voice: 'en' | 'ja'): string {
  return `https://vidsrc.icu/embed/anime/${anilistId}/${episode}/${voice === 'en' ? 1 : 0}`;
}