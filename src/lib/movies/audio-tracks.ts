export type VoiceTrack = { id: string; label: string; language: string; active: boolean; select: () => void };

type NativeTrack = { id?: string; label?: string; language?: string; enabled: boolean };
type TrackList = { length: number; [index: number]: NativeTrack };
type JWPlayer = {
  getAudioTracks: () => { name?: string; language?: string }[];
  getCurrentAudioTrack: () => number;
  setCurrentAudioTrack: (index: number) => void;
};
type VideoPlayer = { audioTracks?: () => TrackList };
type HlsPlayer = { audioTracks: { name?: string; lang?: string }[]; audioTrack: number };
type PlayerWindow = Window & {
  jwplayer?: () => JWPlayer;
  videojs?: { getPlayers?: () => Record<string, VideoPlayer> };
  hls?: HlsPlayer;
  hlsPlayer?: HlsPlayer;
};

export function voiceLabel(language: string, label: string, anime: boolean): string {
  const code = language.toLowerCase().split(/[-_]/)[0];
  if (anime && (code === 'en' || code === 'eng' || /\benglish\b/i.test(label))) return 'English (Dub)';
  if (anime && (code === 'ja' || code === 'jpn' || /japanese/i.test(label))) return 'Japanese (Original)';
  if (label) return label;
  if (language) {
    try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(language) ?? language; } catch { return language; }
  }
  return 'Audio track';
}

/** Read actual player tracks, never subtitle tracks or guessed language URL flags. */
export function discoverVoiceTracks(root: Window | null): VoiceTrack[] {
  const visit = (win: Window | null, path: string, depth: number): VoiceTrack[] => {
    if (!win || depth > 5) return [];
    try {
      const doc = win.document; // Access can fail on a provider's cross-origin frame.
      const native = (tracks: TrackList, prefix: string): VoiceTrack[] => Array.from({ length: tracks.length }, (_, index) => {
        const track = tracks[index];
        return {
          id: `${prefix}-${index}`, label: track?.label ?? '', language: track?.language ?? '', active: track?.enabled ?? false,
          select: () => { for (let i = 0; i < tracks.length; i++) { const item = tracks[i]; if (item) item.enabled = i === index; } },
        };
      });
      const playerWindow = win as PlayerWindow;
      for (const hls of [playerWindow.hls, playerWindow.hlsPlayer]) {
        if (Array.isArray(hls?.audioTracks) && hls.audioTracks.length) return hls.audioTracks.map((track, index) => ({
          id: `${path}-hls-${index}`, label: track.name ?? '', language: track.lang ?? '', active: hls.audioTrack === index,
          select: () => { hls.audioTrack = index; },
        }));
      }
      // JW Player's public audio API also supports tracks not exposed by HTMLMediaElement.
      if (typeof playerWindow.jwplayer === 'function') {
        try {
          const player = playerWindow.jwplayer();
          const tracks = player.getAudioTracks();
          if (tracks.length) return tracks.map((track, index) => ({
            id: `${path}-jw-${index}`, label: track.name ?? '', language: track.language ?? '',
            active: player.getCurrentAudioTrack() === index, select: () => player.setCurrentAudioTrack(index),
          }));
        } catch { /* Player may not have initialized yet. */ }
      }
      const players = playerWindow.videojs?.getPlayers?.() ?? {};
      for (const [id, player] of Object.entries(players)) {
        const tracks = player?.audioTracks?.();
        if (tracks?.length) return native(tracks, `${path}-vjs-${id}`);
      }
      for (const [index, media] of Array.from(doc.querySelectorAll('video, audio')).entries()) {
        const tracks = (media as HTMLMediaElement & { audioTracks?: TrackList }).audioTracks;
        if (tracks?.length) return native(tracks, `${path}-media-${index}`);
      }
      for (const [index, frame] of Array.from(doc.querySelectorAll('iframe')).entries()) {
        const tracks = visit(frame.contentWindow, `${path}-${index}`, depth + 1);
        if (tracks.length) return tracks;
      }
    } catch { /* Unsupported or inaccessible players cannot advertise audio choices. */ }
    return [];
  };
  return visit(root, 'player', 0);
}