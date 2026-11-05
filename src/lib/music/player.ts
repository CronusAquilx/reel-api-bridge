import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openProxied } from "@/lib/astra/proxy";
import type { Prefs } from "@/lib/astra/prefs";
import { nextQueueIndex } from "./qaisify";

export type Track = { id: string; title: string; artist: string; artistId: string; album: string; albumId: string; art: string; duration: number; preview?: string; source?: "piped" | "itunes" };
export const SERVERS = [
  { id: "youtube", name: "YouTube · Qaisify" }, { id: "auto", name: "Auto · audio sources" },
  { id: "saavn", name: "JioSaavn" }, { id: "piped", name: "Piped" }, { id: "soundcloud", name: "SoundCloud" },
  { id: "audius", name: "Audius" }, { id: "deezer", name: "Deezer · preview" },
] as const;
export type Server = (typeof SERVERS)[number]["id"];
type State = { queue: Track[]; cur: number; status: string; paused: boolean; time: number; dur: number; server: Server; mode: "audio" | "video" | null; volume: number; shuffle: boolean; repeat: "off" | "all" | "one"; loading: boolean; fallbackId: string | null; speed: number; sleepUntil: number | null; history: Track[] };
let state: State = { queue: [], cur: -1, status: "", paused: true, time: 0, dur: 0, server: "youtube", mode: null, volume: .7, shuffle: false, repeat: "off", loading: false, fallbackId: null, speed: 1, sleepUntil: null, history: [] };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
let recordedPlay = -1;
function recordPlayback() { const current = state.queue[state.cur]; if (!current || recordedPlay === playId) return; recordedPlay = playId; set({ history: [current, ...state.history].slice(0, 200) }); }
let audio: HTMLAudioElement | null = null;
let token = "";
let playId = 0;
let prefsRef: Prefs | null = null;
interface YTPlayer { loadVideoById(id: string): void; playVideo(): void; pauseVideo(): void; stopVideo(): void; setVolume(v: number): void; setPlaybackRate?(v: number): void; seekTo(t: number, ahead: boolean): void; getCurrentTime(): number; getDuration(): number; destroy(): void; }
type YTWindow = Window & { YT?: { Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer }; onYouTubeIframeAPIReady?: () => void };
let yt: YTPlayer | null = null;
let ytReady: Promise<YTPlayer> | null = null;
let candidates: string[] = [];
let candidateIndex = 0;
let ytGeneration = 0;
let poll: ReturnType<typeof setInterval> | null = null;

export async function musicToken() { const { data } = await supabase.auth.getSession(); token = data.session?.access_token ?? "guest"; return token; }
export const artUrl = (src: string) => src && token && /^https:\/\/([a-z0-9-]+\.)*(dzcdn\.net|deezer\.com|mzstatic\.com)\//i.test(src) ? `/api/music?op=art&src=${encodeURIComponent(src)}&token=${encodeURIComponent(token)}` : src;
export async function musicApi<T>(params: Record<string, string>): Promise<T> {
  await musicToken();
  const res = await fetch(`/api/music?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(res.status === 401 ? "Session expired — sign in again" : body?.error ?? `Music couldn't load (${res.status})`); }
  return res.json();
}
export function downloadUrl(t: Track) { return `/api/music?${new URLSearchParams({ op: "download", title: t.title, artist: t.artist, duration: String(t.duration || 0), preview: t.preview ?? "", token })}`; }
function stopPolling() { if (poll) clearInterval(poll); poll = null; }
function ensure() {
  if (typeof document === "undefined" || audio) return;
  audio = new Audio(); audio.preload = "none"; audio.volume = state.volume;
  audio.addEventListener("timeupdate", () => { if (audio && state.mode === "audio") set({ time: audio.currentTime, dur: Number.isFinite(audio.duration) ? audio.duration : state.dur }); });
  audio.addEventListener("play", () => { if (state.mode === "audio") { recordPlayback(); set({ paused: false, loading: false }); } });
  audio.addEventListener("pause", () => { if (state.mode === "audio") set({ paused: true }); });
  audio.addEventListener("ended", () => next());
  audio.addEventListener("error", () => { if (state.mode === "audio") set({ paused: true, loading: false, status: "Audio unavailable — try YouTube" }); });
}
function youtubePlayer(): Promise<YTPlayer> {
  if (yt) return Promise.resolve(yt);
  if (ytReady) return ytReady;
  const win = window as YTWindow;
  ytReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ytReady = null; reject(new Error("YouTube player unavailable")); }, 8000);
    const mount = () => {
      if (!win.YT?.Player) return;
      const host = document.createElement("div"); host.id = "qaisify-playback-host"; host.className = "qaisify-playback-host";
      document.body.appendChild(host);
      new win.YT.Player(host, { width: 320, height: 180, playerVars: { playsinline: 1, rel: 0, origin: location.origin, widget_referrer: location.href }, events: {
        onReady: (event: { target: YTPlayer }) => { clearTimeout(timer); yt = event.target; yt.setVolume(state.volume * 100); resolve(yt); },
        onStateChange: (event: { data: number }) => {
          if (state.mode !== "video" || ytGeneration !== playId) return;
          if (event.data === 1) { recordPlayback(); set({ paused: false, loading: false, status: "YouTube · may have ads" }); stopPolling(); poll = setInterval(() => { if (yt && state.mode === "video") set({ time: yt.getCurrentTime() || 0, dur: yt.getDuration() || state.dur }); }, 250); }
          else if (event.data === 2) { stopPolling(); set({ paused: true, loading: false }); }
          else if (event.data === 3) set({ loading: true });
          else if (event.data === 0) next();
        },
        onError: (event: { data: number }) => {
          if (state.mode !== "video" || ytGeneration !== playId) return;
          if (event.data !== 153 && candidates[candidateIndex + 1] && yt) { candidateIndex++; yt.loadVideoById(candidates[candidateIndex] ?? ""); set({ loading: true, status: "Trying another verified video…" }); }
          else { stopPolling(); const t = state.queue[state.cur]; set({ mode: null, fallbackId: candidates[0] ?? null, status: "Video blocked — switching to audio…" }); if (t) void proxyOrAudio(t, playId); }
        },
      } });
    };
    if (win.YT?.Player) mount();
    else {
      const previous = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => { previous?.(); mount(); };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) { const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.onerror = () => { clearTimeout(timer); ytReady = null; reject(new Error("YouTube is blocked on this network")); }; document.head.appendChild(script); }
    }
  });
  return ytReady;
}
export function setServer(s: Server) { set({ server: s }); }
let sleepTimeout: ReturnType<typeof setTimeout> | null = null;
export function setSleepTimer(minutes: number | null) {
  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimeout = null;
  set({ sleepUntil: minutes === null ? null : Date.now() + minutes * 60_000 });
  if (minutes !== null) sleepTimeout = setTimeout(() => { audio?.pause(); yt?.pauseVideo(); stopPolling(); set({ paused: true, loading: false, sleepUntil: null }); }, minutes * 60_000);
}
export function setPlaybackSpeed(speed: number) { const value = Math.max(.5, Math.min(2, speed)); if (audio) audio.playbackRate = value; yt?.setPlaybackRate?.(value); set({ speed: value }); }
export function clearMusicHistory() { set({ history: [] }); }
export function setVolume(v: number) { ensure(); const volume = Math.max(0, Math.min(1, v)); if (audio) audio.volume = volume; yt?.setVolume(volume * 100); set({ volume }); }
export function setPlayerPrefs(p: Prefs) { prefsRef = p; }
export function toggleShuffle() { set({ shuffle: !state.shuffle }); }
export function toggleRepeat() { set({ repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" }); }
export function addToQueue(t: Track) { set({ queue: [...state.queue, t] }); }
export function removeFromQueue(i: number) { if (i === state.cur) return; set({ queue: state.queue.filter((_, n) => i !== n), cur: i < state.cur ? state.cur - 1 : state.cur }); }
export async function playList(list: Track[], i: number) {
  ensure(); const t = list[i]; if (!t || !audio) return;
  const my = ++playId; clearProxy(); stopPolling(); audio.pause(); audio.removeAttribute("src"); yt?.stopVideo();
  set({ queue: list, cur: i, status: "Finding your song…", paused: true, loading: true, time: 0, dur: t.duration, mode: null, fallbackId: null });
  audio.playbackRate = state.speed;
  const want = { q: `${t.artist} ${t.title}`, title: t.title, artist: t.artist, duration: String(t.duration || 0), preview: t.preview ?? "" };
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: t.art ? [{ src: t.art }] : [] });
  if (state.server !== "youtube") {
    try {
      const r = await musicApi<{ url: string | null; server?: string }>({ op: "resolve", server: state.server, ...want });
      if (my !== playId) return;
      if (r.url && audio) { audio.src = `/api/music?op=audio&u=${encodeURIComponent(r.url)}&token=${encodeURIComponent(token)}`; set({ mode: "audio", status: state.server === "deezer" ? "30-second preview" : (r.server ?? state.server) }); await audio.play(); if (my === playId) set({ loading: false, paused: false }); return; }
    } catch { /* YouTube is the next explicit fallback, not another slow source chain. */ }
  }
  const ready = youtubePlayer().catch(() => null);
  try {
    const result = await musicApi<{ ids: string[]; error?: string }>({ op: "video", q: `${t.artist} ${t.title}`, title: t.title, artist: t.artist });
    if (my !== playId) return;
    const first = result.ids[0];
    if (!first) { set({ status: "Switching to audio…" }); void audioFallback(t, my); return; }
    candidates = result.ids;
    const player = await ready;
    if (my !== playId) return;
    if (!player) { set({ loading: false, paused: true, fallbackId: first, status: "YouTube controls unavailable — open player" }); return; }
    candidates = result.ids; candidateIndex = 0; ytGeneration = my;
    set({ mode: "video", status: "Starting YouTube…" }); player.loadVideoById(first); player.setVolume(state.volume * 100); player.setPlaybackRate?.(state.speed); player.playVideo();
    const watchdog = (index: number) => setTimeout(() => { if (my !== playId || !state.loading || candidateIndex !== index) return; const nextId = candidates[index + 1]; if (nextId && yt) { candidateIndex = index + 1; yt.loadVideoById(nextId); set({ status: "Trying another video…" }); watchdog(index + 1); } else void proxyOrAudio(t, my); }, 7000);
    watchdog(0);
    const upcoming = list[i + 1]; if (upcoming) void musicApi({ op: "video", q: `${upcoming.artist} ${upcoming.title}`, title: upcoming.title, artist: upcoming.artist }).catch(() => {});
  } catch (e) { if (my === playId) set({ loading: false, paused: true, status: e instanceof Error ? e.message : "Song unavailable" }); }
}
let proxyFrame: HTMLIFrameElement | null = null;
function clearProxy() { proxyFrame?.remove(); proxyFrame = null; if (typeof document !== "undefined") document.querySelectorAll<HTMLElement>(".qaisify-playback-host").forEach(el => { el.style.visibility = ""; }); }
// Blocked YouTube embeds go straight to server-fetched audio (network restrictions only block the YouTube player).
function proxyOrAudio(t: Track, my: number) { clearProxy(); return audioFallback(t, my); }
async function audioFallback(t: Track, my: number) {
  ensure();
  try {
    const r = await musicApi<{ url: string | null; server?: string }>({ op: "resolve", server: "auto", q: `${t.artist} ${t.title}`, title: t.title, artist: t.artist, duration: String(t.duration || 0), preview: t.preview ?? "" });
    if (my !== playId || !audio) return;
    if (r.url) { audio.src = `/api/music?op=audio&u=${encodeURIComponent(r.url)}&token=${encodeURIComponent(token)}`; set({ mode: "audio", status: r.server ?? "Audio" }); await audio.play(); if (my === playId) set({ loading: false, paused: false }); return; }
  } catch { /* fall through to proxy player */ }
  if (my === playId) set({ loading: false, paused: true, status: "Open the proxied player to listen" });
}
export function toggle() { ensure(); if (proxyFrame) { clearProxy(); set({ paused: true }); return; } if (state.mode === "audio" && audio?.src) { if (audio.paused) void audio.play().catch(() => set({ status: "Press play again", loading: false })); else audio.pause(); } else if (state.mode === "video" && yt) { if (state.paused) yt.playVideo(); else yt.pauseVideo(); } else if (state.cur >= 0) void playList(state.queue, state.cur); }
export function next() { const index = nextQueueIndex(state.cur, state.queue.length, state.repeat, state.shuffle); if (index >= 0) void playList(state.queue, index); else { audio?.pause(); yt?.pauseVideo(); stopPolling(); set({ paused: true, loading: false }); } }
export function prev() { if (state.time > 3) { seek(0); return; } void playList(state.queue, Math.max(0, state.cur - 1)); }
export function seek(t: number) { const time = Math.max(0, Math.min(t, state.dur)); if (state.mode === "audio" && audio) audio.currentTime = time; if (state.mode === "video") yt?.seekTo(time, true); set({ time }); }
export function stop() { playId++; clearProxy(); audio?.pause(); yt?.stopVideo(); stopPolling(); set({ cur: -1, queue: [], mode: null, paused: true, loading: false, fallbackId: null }); }
export function getAudio() { ensure(); return audio; }
export function getPlayer() { return state; }
export async function openMusicProxy(iframe: HTMLIFrameElement) { const t = state.queue[state.cur]; const videoId = state.fallbackId ?? candidates[candidateIndex]; if (!prefsRef || !t || !videoId) return; yt?.pauseVideo(); set({ paused: true, mode: null }); await openProxied(iframe, `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, prefsRef); }
export function usePlayer() { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state, () => state); }
