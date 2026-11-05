import { describe, expect, it } from 'vitest';
import { discoverVoiceTracks, voiceLabel } from './audio-tracks';

describe('spoken audio languages', () => {
  it('labels English anime audio as Dub', () => {
    expect(voiceLabel('en', 'English', true)).toBe('English (Dub)');
    expect(voiceLabel('ja', 'Japanese', true)).toBe('Japanese (Original)');
  });
  it('switches the actual spoken track independently of subtitles', () => {
    const video = document.createElement('video');
    const audioTracks = { length: 2, 0: { language: 'ja', label: 'Japanese', enabled: true }, 1: { language: 'en', label: 'English', enabled: false } };
    Object.defineProperty(video, 'audioTracks', { value: audioTracks });
    const subtitle = document.createElement('track');
    subtitle.kind = 'subtitles'; subtitle.srclang = 'es'; video.append(subtitle);
    document.body.append(video);
    const tracks = discoverVoiceTracks(window);
    expect(tracks.map(t => t.language)).toEqual(['ja', 'en']);
    tracks[1]?.select();
    expect(audioTracks[0].enabled).toBe(false);
    expect(audioTracks[1].enabled).toBe(true);
    expect(subtitle.srclang).toBe('es');
    video.remove();
  });
  it('does not invent English or movie languages when no audio tracks exist', () => {
    expect(discoverVoiceTracks(null)).toEqual([]);
    expect(discoverVoiceTracks(window)).toEqual([]);
  });
  it('uses the public JW audio API to change movie voices', () => {
    let selected = 0;
    const win = { document, jwplayer: () => ({ getAudioTracks: () => [{ name: 'English', language: 'en' }, { name: 'Spanish', language: 'es' }], getCurrentAudioTrack: () => selected, setCurrentAudioTrack: (index: number) => { selected = index; } }) } as unknown as Window;
    const tracks = discoverVoiceTracks(win);
    tracks[1]?.select();
    expect(selected).toBe(1);
    expect(discoverVoiceTracks(win)[1]?.active).toBe(true);
  });
  it('switches English voices exposed by an HLS player', () => {
    const hls = { audioTracks: [{ name: 'Japanese', lang: 'ja' }, { name: 'English', lang: 'en' }], audioTrack: 0 };
    const win = { document, hls } as unknown as Window;
    discoverVoiceTracks(win)[1]?.select();
    expect(hls.audioTrack).toBe(1);
    expect(discoverVoiceTracks(win)[1]?.active).toBe(true);
  });
  it('does not label a Spanish dub as English', () => {
    expect(voiceLabel('es', 'Spanish Dub', true)).toBe('Spanish Dub');
  });
});