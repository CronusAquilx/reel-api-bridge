import { describe, expect, it } from 'vitest';
import { matchesVoice, nextVoiceSource } from './voice-search';

describe('English source search', () => {
  it('recognizes actual English audio metadata', () => {
    expect(matchesVoice({ language: 'en-US', label: '' }, 'en')).toBe(true);
    expect(matchesVoice({ language: 'eng', label: '' }, 'en')).toBe(true);
    expect(matchesVoice({ language: '', label: 'English Dub' }, 'en')).toBe(true);
  });
  it('does not assume an unlabelled or non-English dub is English', () => {
    expect(matchesVoice({ language: 'es', label: 'Spanish Dub' }, 'en')).toBe(false);
    expect(matchesVoice({ language: '', label: 'Dub' }, 'en')).toBe(false);
    expect(matchesVoice({ language: '', label: 'Default' }, 'en')).toBe(false);
  });
  it('moves through sources once and stops when all have been tried', () => {
    const sources = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];
    const tried = new Set(['first']);
    expect(nextVoiceSource(sources, tried)).toBe('second');
    tried.add('second');
    expect(nextVoiceSource(sources, tried)).toBe('third');
    tried.add('third');
    expect(nextVoiceSource(sources, tried)).toBeUndefined();
  });
});