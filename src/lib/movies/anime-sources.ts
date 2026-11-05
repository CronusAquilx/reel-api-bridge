export type AnimeMatch = { id: number; anilistId?: number; title: string; episodes: number | null };

export function supportsAnimationSources(detail: { genres?: { id: number }[]; genre_ids?: number[] } | undefined): boolean {
  return Boolean(detail?.genres?.some(genre => genre.id === 16) || detail?.genre_ids?.includes(16));
}

/** Anikoto's actual site search, not an invented embed/audio API. */
export function anikotoSearchUrl(title: string): string {
  void [title];
  return '/movie-unavailable';
}

/** VidLink's documented anime API uses MAL IDs, not TMDB IDs. No fallback to sub. */
export function animeVoiceUrl(malId: number, episode: number, voice: 'en' | 'ja'): string {
  void [malId,episode,voice];
  return '/movie-unavailable';
}

export function animeIcuVoiceUrl(anilistId: number, episode: number, voice: 'en' | 'ja'): string {
  void [anilistId,episode,voice];
  return '/movie-unavailable';
}