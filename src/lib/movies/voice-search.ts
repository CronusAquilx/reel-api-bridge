import type { VoiceTrack } from './audio-tracks';

export const VOICE_SEARCH_WAIT_MS = 25000;

export function matchesVoice(track: Pick<VoiceTrack, 'language' | 'label'>, language: string): boolean {
  const code = track.language.toLowerCase().split(/[-_]/)[0];
  if (language === 'en') return code === 'en' || code === 'eng' || /\benglish\b/i.test(track.label);
  if (language === 'ja') return code === 'ja' || code === 'jpn' || /\bjapanese\b/i.test(track.label);
  return code === language;
}

export function nextVoiceSource(sources: readonly { id: string }[], tried: ReadonlySet<string>): string | undefined {
  return sources.find(source => !tried.has(source.id))?.id;
}