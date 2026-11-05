import { expect, it } from 'vitest';
import { anikotoSearchUrl, animeIcuVoiceUrl, animeVoiceUrl, supportsAnimationSources } from './anime-sources';
it('requests anime dub using the confirmed MAL ID without falling back to sub', () => {
  expect(animeVoiceUrl(21, 2, 'en')).toBe('https://vidlink.pro/anime/21/2/dub');
  expect(animeVoiceUrl(21, 2, 'ja')).toBe('https://vidlink.pro/anime/21/2/sub');
});
it('requests the second dub source with an AniList ID, never a TMDB ID', () => {
  expect(animeIcuVoiceUrl(21, 3, 'en')).toBe('https://vidsrc.icu/embed/anime/21/3/1');
  expect(animeIcuVoiceUrl(21, 3, 'ja')).toBe('https://vidsrc.icu/embed/anime/21/3/0');
});
it('offers animation sources for New Gods: Nezha Reborn, not just Japanese titles', () => {
  expect(supportsAnimationSources({ genres: [{ id: 16 }, { id: 14 }, { id: 28 }] })).toBe(true);
  expect(supportsAnimationSources({ genres: [{ id: 28 }] })).toBe(false);
});
it('uses Anikoto search without claiming a title has an English dub', () => {
  const url = new URL(anikotoSearchUrl('New Gods: Nezha Reborn'));
  expect(url.origin).toBe('https://anikoto.com.co');
  expect(url.searchParams.get('s')).toBe('New Gods: Nezha Reborn');
  expect(url.searchParams.has('dub')).toBe(false);
});