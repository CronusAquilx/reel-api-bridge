import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/astra/api-user.server";
import { playableVideoIds, QAISIFY_ROWS, qaisifyTrack } from "@/lib/music/qaisify";
import { catalogSearch } from "@/lib/music/catalog";

/** Music relay: Deezer catalog (songs, albums, artists), artwork, lyrics and YouTube lookups load through Astra's server. */
const DZ = "https://api.deezer.com";

const catalogCache = new Map<string, { at: number; data: any }>();
async function itunes(path: string): Promise<any> {
  const cached = catalogCache.get(path);
  if (cached && Date.now() - cached.at < 300_000) return cached.data;
  let r = await fetch(`https://itunes.apple.com${path}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) r = await fetch(`https://itunes.apple.com${path}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) throw new Error("Song catalog unavailable — please try again");
  const data = await r.json();
  catalogCache.set(path, { at: Date.now(), data });
  if (catalogCache.size > 200) { const first = catalogCache.keys().next().value; if (first) catalogCache.delete(first); }
  return data;
}
const appleSearch = (term: string, entity = "song", limit = 25) => itunes(`/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=${limit}&country=us`);
const appleAlbum = (a: any) => ({ id: `itunes:${a.collectionId}`, title: a.collectionName ?? "", artist: a.artistName ?? "", art: String(a.artworkUrl100 ?? "").replace(/\d+x\d+bb/, "600x600bb"), year: String(a.releaseDate ?? "").slice(0, 4) });
const appleArtist = (a: any) => ({ id: `itunes:${a.artistId}`, name: a.artistName ?? "", art: "" });
async function youtube(path: string, params: Record<string, string>): Promise<any> {
  const googleKey = process.env["GOOGLE_API_KEY"];
  if (googleKey) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key: googleKey })}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => null);
      const reason = data?.error?.errors?.[0]?.reason;
      const knownReasons = ["quotaExceeded", "dailyLimitExceeded", "keyInvalid", "accessNotConfigured", "ipRefererBlocked", "forbidden"];
      const detail = knownReasons.includes(reason) ? `: ${reason}` : "";
      console.error(`YouTube lookup [${r.status}]${detail}`);
      throw new Error(`YouTube lookup unavailable (${r.status})${detail}`);
    }
    return r.json();
  }
  const key = process.env["UDC_QAISIFY_YOUTUBE_API_KEY"], gatewayKey = process.env["LOVABLE_API_KEY"];
  if (!key || !gatewayKey) throw new Error("Connect YouTube to restore song playback");
  const r = await fetch(`https://connector-gateway.lovable.dev/udc_qaisify_youtube/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key }, signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) { const body = await r.text(); console.error(`YouTube lookup [${r.status}]: ${body}`); throw new Error(`YouTube lookup unavailable (${r.status})`); }
  return r.json();
}
const youtubeCache = new Map<string, { at: number; ids: string[] }>();

async function authed(request: Request, url: URL) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
  if (!token) return false;
  if (token === "guest") return true; // guests use the public catalog; nothing saves
  return Boolean(await authenticateRequest(new Request(request.url, { headers: { authorization: `Bearer ${token}` } })));
}

function json(data: unknown, cache = 300) {
  return Response.json(data, { headers: { "cache-control": `private, max-age=${cache}` } });
}

async function dz(path: string): Promise<any> {
  const r = await fetch(`${DZ}${path}`, { headers: { "user-agent": "Mozilla/5.0 Astra" } }).catch(() => null);
  if (!r?.ok) return {};
  return r.json().catch(() => ({}));
}

const track = (t: any, album?: any) => ({
  id: String(t.id), title: t.title ?? "", artist: t.artist?.name ?? "", artistId: String(t.artist?.id ?? ""),
  album: t.album?.title ?? album?.title ?? "", albumId: String(t.album?.id ?? album?.id ?? ""),
  art: t.album?.cover_big ?? album?.cover_big ?? "", duration: t.duration ?? 0, preview: t.preview ?? "",
});

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };
let scId: { id: string; at: number } | null = null;
async function soundcloudId(): Promise<string> {
  if (scId && Date.now() - scId.at < 6 * 3600_000) return scId.id;
  const html = await (await fetch("https://soundcloud.com", { headers: UA })).text();
  const scripts = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js/g)].map((m) => m[0]).reverse();
  for (const src of scripts) {
    const m = (await (await fetch(src)).text()).match(/client_id:"([A-Za-z0-9]{32})"/);
    if (m) { scId = { id: m[1]!, at: Date.now() }; return m[1]!; }
  }
  throw new Error("SoundCloud unavailable");
}

type Want = { title: string; artist: string; duration: number };
const BAD = /\b(cover|covered|remix|nightcore|sped ?up|slowed|reverb|karaoke|instrumental|8d|mashup|bass ?boost(ed)?|tribute|parody|piano version|lofi|lo-fi|type beat|reaction|edit|bootleg|flip|rework|vip)\b/i;
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
/** Scores how likely a candidate is the original studio recording of the wanted song. */
function matchScore(title: string, artist: string, dur: number, w: Want) {
  const wt = norm(w.title.replace(/\(.*?\)|\[.*?\]/g, "")), wa = norm(w.artist.split(/,|&| feat/i)[0] ?? w.artist);
  const ct = norm(title), ca = norm(artist);
  let s = 0;
  if (ct.includes(wt)) s += 5;
  else { const words = wt.split(" ").filter(Boolean); const hit = words.filter((x) => ct.includes(x)).length; s += words.length ? (hit / words.length) * 3 : 0; }
  if (wa && ca && (ca.includes(wa) || wa.includes(ca))) s += 4;
  else if (wa) return -100; // a different artist is never the original
  if (BAD.test(title) && !BAD.test(w.title)) s -= 8;
  if (/\blive\b/i.test(title) && !/\blive\b/i.test(w.title)) s -= 3;
  if (dur && w.duration) { const d = Math.abs(dur - w.duration); s += d <= 3 ? 4 : d <= 8 ? 2 : d <= 20 ? 0 : -4; }
  return s;
}

/** Finds a playable audio URL for a song on the chosen server, preferring the original recording. */
async function resolveAudio(server: string, w: Want, preview: string): Promise<string | null> {
  const q = `${w.artist} ${w.title}`;
  if (server === "deezer") return /^https:\/\/[a-z0-9-]+\.dzcdn\.net\//i.test(preview) ? preview : null;
  if (server === "saavn") {
    const saavn = (process.env["SAAVN_API"] ?? "https://saavn.sumit.co").replace(/\/+$/, "");
    const d: any = await fetch(`${saavn}/api/search/songs?query=${encodeURIComponent(q)}&limit=20`, { signal: AbortSignal.timeout(6000) }).then((x) => x.json()).catch(() => ({}));
    const ranked = (d.data?.results ?? []).map((x: any) => ({ x, s: matchScore(unesc(x.name ?? ""), (x.artists?.primary ?? []).map((a: any) => a.name).join(", "), Number(x.duration ?? 0), w) })).sort((a: any, b: any) => b.s - a.s);
    const t = ranked[0]?.s >= 10 ? ranked[0].x : null;
    const dl: any[] = t?.downloadUrl ?? [];
    const best = dl.find((u) => u.quality === "320kbps") ?? dl.find((u) => u.quality === "160kbps") ?? dl[dl.length - 1];
    return best?.url && AUDIO_HOST.test(best.url) ? best.url : null;
  }
  if (server === "piped") {
    const ranked = (await pipedSearch(q)).map((x: any) => ({ x, s: matchScore(x.title, x.artist, x.duration, w) })).sort((a, b) => b.s - a.s);
    const t = (ranked[0]?.s ?? 0) >= 5 ? ranked[0]!.x : null;
    if (!t) return null;
    const raw = await pipedStream(t.id.slice(6));
    return raw ? raw : null;
  }
  if (server === "audius") {
    const r: any = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=birchblock`).then((x) => x.json()).catch(() => ({}));
    const ranked = (r.data ?? []).filter((x: any) => x?.is_streamable !== false && x?.user?.is_verified)
      .map((x: any) => ({ x, s: matchScore(x.title ?? "", x.user?.name ?? "", x.duration ?? 0, w) }))
      .sort((a: any, b: any) => b.s - a.s);
    const t = ranked[0]?.s >= 7 ? ranked[0].x : null;
    return t ? `https://api.audius.co/v1/tracks/${encodeURIComponent(t.id)}/stream?app_name=birchblock` : null;
  }
  if (server === "soundcloud") {
    const cid = await soundcloudId();
    const r: any = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&limit=20&client_id=${cid}`, { headers: UA }).then((x) => x.json()).catch(() => ({}));
    const ranked = (r.collection ?? [])
      .filter((t: any) => t.policy !== "BLOCK" && t.policy !== "SNIP")
      .map((t: any) => ({ t, s: matchScore(t.title ?? "", t.publisher_metadata?.artist || t.user?.username || "", Math.round((t.full_duration ?? t.duration ?? 0) / 1000), w) }))
      .sort((a: any, b: any) => b.s - a.s);
    for (const { t, s } of ranked.slice(0, 5)) {
      if (s < 7) break;
      const prog = (t.media?.transcodings ?? []).find((x: any) => x.format?.protocol === "progressive");
      if (!prog) continue;
      const j: any = await fetch(`${prog.url}?client_id=${cid}`, { headers: UA }).then((x) => x.json()).catch(() => ({}));
      if (j.url) return j.url;
    }
    return null;
  }
  return null;
}
const unesc = (x: string) => x.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'");
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
/** Asks every full-length ad-free source at once and returns the first real match, so one slow source never stalls playback. */
async function resolveFast(w: Want): Promise<{ url: string; server: string } | null> {
  const servers = ["saavn", "soundcloud", "audius", "piped"];
  const tries = servers.map((sv) => within(resolveAudio(sv, w, ""), 9000).then((url) => (url ? { url, server: sv } : Promise.reject())));
  return Promise.any(tries).catch(() => null);
}
/* ---------- Piped (YouTube Music via Piped instances), all calls server-side ---------- */
const PIPED_DEFAULT = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee", "https://pipedapi.r4fo.com"];
const pipedInstances = () => {
  const list = (process.env["PIPED_INSTANCES"] ?? "").split(",").map((x) => x.trim().replace(/\/+$/, "")).filter((x) => /^https:\/\//.test(x));
  return list.length ? list : PIPED_DEFAULT;
};
let pipedDown = false;
/** Tries each instance in order, failing over on any non-200. */
async function piped(path: string): Promise<any> {
  for (const base of pipedInstances()) {
    const r = await fetch(`${base}${path}`, { headers: UA, signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (r?.ok) { const j = await r.json().catch(() => null); if (j) { pipedDown = false; return j; } }
  }
  pipedDown = true;
  throw new Error("All Piped instances are down");
}
const pipedCache = new Map<string, { at: number; tracks: any[] }>();
const videoIdOf = (u: string) => (u.split("=")[1] ?? "").slice(0, 20);
async function pipedSearch(q: string): Promise<any[]> {
  const key = q.toLowerCase();
  const hit = pipedCache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.tracks;
  const d = await piped(`/search?q=${encodeURIComponent(q)}&filter=music_songs`);
  const seen = new Set<string>();
  const tracks = (d.items ?? []).flatMap((it: any) => {
    const vid = videoIdOf(String(it.url ?? ""));
    const dur = Number(it.duration ?? 0);
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(vid) || seen.has(vid) || dur > 900) return [];
    seen.add(vid);
    return [{ id: `piped:${vid}`, title: it.title ?? "", artist: String(it.uploaderName ?? "").replace(/ - Topic$/, ""), artistId: "", album: "", albumId: "", art: it.thumbnail ?? "", duration: dur > 0 ? dur : 0, source: "piped" }];
  });
  pipedCache.set(key, { at: Date.now(), tracks });
  if (pipedCache.size > 300) pipedCache.delete(pipedCache.keys().next().value!);
  return tracks;
}
/** Picks itag 140, else the highest-bitrate audio stream; returns the raw stream URL. */
async function pipedStream(vid: string): Promise<string | null> {
  const d = await piped(`/streams/${encodeURIComponent(vid)}`);
  const streams: any[] = (d.audioStreams ?? []).filter((s: any) => typeof s.url === "string" && s.url.startsWith("https://"));
  const best = streams.find((s) => Number(s.itag) === 140) ?? streams.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
  return best?.url ?? null;
}
const PIPED_AUDIO_HOST = /^https:\/\/([a-z0-9-]+\.)*(googlevideo\.com|[a-z0-9-]*piped[a-z0-9.-]*|kavin\.rocks|adminforge\.de|private\.coffee|r4fo\.com)(:\d+)?\//i;
const AUDIO_HOST = /^https:\/\/(([a-z0-9-]+\.)*(dzcdn\.net|sndcdn\.com|saavncdn\.com)\/|api\.audius\.co\/v1\/tracks\/)/i;
const albumOf = (a: any) => ({ id: String(a.id), title: a.title ?? "", artist: a.artist?.name ?? "", art: a.cover_big ?? "", year: (a.release_date ?? "").slice(0, 4) });
const artistOf = (a: any) => ({ id: String(a.id), name: a.name ?? "", art: a.picture_big ?? "", fans: a.nb_fan ?? 0 });
const playlistOf = (p: any) => ({ id: String(p.id), title: p.title ?? "", art: p.picture_big ?? "", count: p.nb_tracks ?? 0, by: p.user?.name ?? "" });
const id = (v: string | null) => (/^\d{1,15}$/.test(v ?? "") ? v : null);

async function handle({ request }: { request: Request }) {
  const url = new URL(request.url);
  if (!(await authed(request, url))) return new Response("Unauthorized", { status: 401 });
  const q = encodeURIComponent((url.searchParams.get("q") ?? "").slice(0, 200));

  switch (url.searchParams.get("op")) {
    case "qaisify-home": {
      const results = await Promise.all(QAISIFY_ROWS.map(async row => ({ ...row, tracks: await (async () => {
        const apple = (await appleSearch(row.term).catch(() => ({ results: [] }))).results.filter((x: any) => x.kind === "song").map(qaisifyTrack);
        if (apple.length) return apple;
        const d = await dz(`/search?q=${encodeURIComponent(row.term)}&limit=20`).catch(() => ({}));
        return Array.isArray(d.data) ? d.data.map((x: any) => track(x)) : [];
      })() })));
      return json({ rows: results }, 300);
    }
    case "qaisify-search": {
      const raw = (url.searchParams.get("q") ?? "").slice(0, 200);
      try {
        return json(await catalogSearch(
          async () => (await appleSearch(raw, "song", 30)).results.filter((x: any) => x.kind === "song").map(qaisifyTrack),
          async () => (await appleSearch(raw, "album", 12)).results.map(appleAlbum),
          async () => (await appleSearch(raw, "musicArtist", 8)).results.map(appleArtist),
          async () => {
            const d = await dz(`/search?q=${q}&limit=30`);
            if (!Array.isArray(d.data)) throw new Error("Song catalog unavailable");
            return d.data.map((x: any) => track(x));
          },
        ));
      } catch { return Response.json({ error: "Song catalogs are temporarily unavailable. Try again." }, { status: 503 }); }
    }
    case "home": {
      const d = await dz("/chart/0?limit=30");
      return json({
        tracks: (d.tracks?.data ?? []).map((t: any) => track(t)),
        albums: (d.albums?.data ?? []).map(albumOf),
        artists: (d.artists?.data ?? []).map(artistOf),
      }, 1800);
    }
    case "search": {
      const raw = (url.searchParams.get("q") ?? "").slice(0, 200);
      const [t, al, ar, pp] = await Promise.all([dz(`/search?q=${q}&limit=30`), dz(`/search/album?q=${q}&limit=20`), dz(`/search/artist?q=${q}&limit=12`), pipedSearch(raw).catch(() => [])]);
      return json({ tracks: [...pp.slice(0, 20), ...(t.data ?? []).map((x: any) => track(x))], albums: (al.data ?? []).map(albumOf), artists: (ar.data ?? []).map(artistOf), pipedDown });
    }
    case "piped-status": return json({ down: pipedDown, instances: pipedInstances().length }, 0);
    case "piped-stream": {
      const vid = url.searchParams.get("id") ?? "";
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(vid)) return new Response("Bad id", { status: 400 });
      try { const raw = await pipedStream(vid); return json({ url: raw ? raw : null }, 0); }
      catch { return json({ url: null, down: true }, 0); }
    }
    case "album": {
      const apple = /^itunes:(\d{1,15})$/.exec(url.searchParams.get("id") ?? "");
      if (apple) { const d = await itunes(`/lookup?id=${apple[1]}&entity=song&country=us`); const a = d.results.find((x: any) => x.wrapperType === "collection"); return json({ ...appleAlbum(a ?? {}), tracks: d.results.filter((x: any) => x.kind === "song").map(qaisifyTrack) }); }
      const i = id(url.searchParams.get("id"));
      if (!i) return new Response("Bad id", { status: 400 });
      const a = await dz(`/album/${i}`);
      return json({ ...albumOf(a), tracks: (a.tracks?.data ?? []).map((t: any) => track(t, a)) }, 3600);
    }
    case "artist": {
      const apple = /^itunes:(\d{1,15})$/.exec(url.searchParams.get("id") ?? "");
      if (apple) { const [songs, albums] = await Promise.all([itunes(`/lookup?id=${apple[1]}&entity=song&limit=25&country=us`), itunes(`/lookup?id=${apple[1]}&entity=album&limit=25&country=us`)]); return json({ ...appleArtist(songs.results[0] ?? {}), tracks: songs.results.filter((x: any) => x.kind === "song").map(qaisifyTrack), albums: albums.results.filter((x: any) => x.wrapperType === "collection").map(appleAlbum) }); }
      const i = id(url.searchParams.get("id"));
      if (!i) return new Response("Bad id", { status: 400 });
      const [a, top, albums] = await Promise.all([dz(`/artist/${i}`), dz(`/artist/${i}/top?limit=20`), dz(`/artist/${i}/albums?limit=40`)]);
      return json({ ...artistOf(a), tracks: (top.data ?? []).map((t: any) => track(t)), albums: (albums.data ?? []).map((x: any) => albumOf({ ...x, artist: a })) }, 3600);
    }
    case "art": {
      const src = url.searchParams.get("src") ?? "";
      if (!/^https:\/\/([a-z0-9-]+\.)*(dzcdn\.net|deezer\.com|mzstatic\.com)\//i.test(src)) return new Response("Bad url", { status: 400 });
      const r = await fetch(src);
      return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=86400" } });
    }
    case "resolve": {
      const raw = (url.searchParams.get("q") ?? "").slice(0, 200);
      try {
        const want: Want = { title: url.searchParams.get("title") || raw, artist: url.searchParams.get("artist") ?? "", duration: Number(url.searchParams.get("duration") ?? 0) || 0 };
        if (url.searchParams.get("server") === "auto") return json(await resolveFast(want) ?? { url: null }, 0);
        const audio = await resolveAudio(url.searchParams.get("server") ?? "", want, url.searchParams.get("preview") ?? "");
        return json({ url: audio }, 0);
      } catch (e) { return json({ url: null, error: e instanceof Error ? e.message : "failed" }, 0); }
    }
    case "audio": {
      const src = url.searchParams.get("u") ?? "";
      if (!AUDIO_HOST.test(src) && !PIPED_AUDIO_HOST.test(src)) return new Response("Bad url", { status: 400 });
      const range = request.headers.get("range");
      const r = await fetch(src, { headers: { ...UA, ...(range ? { range } : {}) }, redirect: "follow" });
      const h = new Headers({ "content-type": r.headers.get("content-type") ?? "audio/mpeg", "cache-control": "private, max-age=3600", "accept-ranges": "bytes" });
      for (const k of ["content-length", "content-range"]) { const v = r.headers.get(k); if (v) h.set(k, v); }
      return new Response(r.body, { status: r.status, headers: h });
    }
    case "genres": {
      const d = await dz("/genre");
      return json({ genres: (d.data ?? []).filter((g: any) => g.id !== 0).map((g: any) => ({ id: String(g.id), name: g.name, art: g.picture_big ?? "" })) }, 86400);
    }
    case "genre": {
      const i = id(url.searchParams.get("id"));
      if (!i) return new Response("Bad id", { status: 400 });
      const [c, g] = await Promise.all([dz(`/chart/${i}?limit=40`), dz(`/genre/${i}`)]);
      return json({ name: g.name ?? "Genre", tracks: (c.tracks?.data ?? []).map((t: any) => track(t)), albums: (c.albums?.data ?? []).map(albumOf), artists: (c.artists?.data ?? []).map(artistOf), playlists: (c.playlists?.data ?? []).map(playlistOf) }, 1800);
    }
    case "charts-playlists": {
      const d = await dz("/chart/0/playlists?limit=24");
      return json({ playlists: (d.data ?? []).map(playlistOf) }, 1800);
    }
    case "playlist": {
      const i = id(url.searchParams.get("id"));
      if (!i) return new Response("Bad id", { status: 400 });
      const p = await dz(`/playlist/${i}`);
      return json({ ...playlistOf(p), tracks: (p.tracks?.data ?? []).map((t: any) => track(t)) }, 3600);
    }
    case "lyrics": {
      const artist = url.searchParams.get("artist") ?? "";
      let text = "", synced = "";
      try {
        const lr = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${q}`, { headers: { "user-agent": "BirchBlock/1.0" } });
        if (lr.ok) { const d: any = await lr.json(); text = d.plainLyrics ?? ""; synced = d.syncedLyrics ?? ""; }
      } catch { /* fall through */ }
      if (!text && !synced) {
        try {
          const ls = await fetch(`https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${q}`, { headers: { "user-agent": "BirchBlock/1.0" } });
          if (ls.ok) { const arr: any[] = await ls.json(); const hit = arr.find((x) => x.plainLyrics || x.syncedLyrics); if (hit) { text = hit.plainLyrics ?? ""; synced = hit.syncedLyrics ?? ""; } }
        } catch { /* fall through */ }
      }
      if (!text && !synced) {
        const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${q}`).catch(() => null);
        const d: any = r?.ok ? await r.json().catch(() => ({})) : {};
        text = String(d.lyrics ?? "").trim();
      }
      return json({ lyrics: text, synced }, 86400);
    }
    case "download": {
      const want: Want = { title: url.searchParams.get("title") || q, artist: url.searchParams.get("artist") ?? "", duration: Number(url.searchParams.get("duration") ?? 0) || 0 };
      const preview = url.searchParams.get("preview") ?? "";
      const candidates: string[] = [];
      if (/^https:\/\/[a-z0-9-]+\.dzcdn\.net\//i.test(preview)) candidates.push(preview);
      for (const sv of ["soundcloud", "audius"]) {
        try { const u = await resolveAudio(sv, want, ""); if (u) candidates.push(u); } catch { /* ignore */ }
      }
      let r: Response | null = null;
      for (const src of candidates) {
        try {
          const res = await fetch(src, { headers: UA, redirect: "follow" });
          if (res.ok && res.body) { r = res; break; }
        } catch { /* try next */ }
      }
      if (!r) return new Response("No downloadable version found", { status: 404 });
      const fname = `${want.artist} - ${want.title}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 100).trim() || "song";
      return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "audio/mpeg", "content-disposition": `attachment; filename="${fname}.mp3"`, "cache-control": "private, no-store" } });
    }
    case "video": {
      const query = (url.searchParams.get("q") ?? "").slice(0, 200);
      const cached = youtubeCache.get(query);
      if (cached && Date.now() - cached.at < 300_000) return json({ ids: cached.ids });
      try {
      const d = await youtube("search", { part: "snippet", type: "video", maxResults: "50", videoEmbeddable: "true", q: query });
      const want: Want = { title: url.searchParams.get("title") ?? "", artist: url.searchParams.get("artist") ?? "", duration: 0 };
      const items = (d.items ?? []).filter((i: any) => typeof i?.id?.videoId === "string" && /^[\w-]{11}$/.test(i.id.videoId));
      const ranked = want.title
        ? items.map((i: any, n: number) => ({ i, s: matchScore(i.snippet?.title ?? "", i.snippet?.channelTitle ?? "", 0, want) + (/lyrics?|official (audio|video)/i.test(i.snippet?.title ?? "") ? 2 : 0) - (/( - topic|vevo)$/i.test(i.snippet?.channelTitle ?? "") ? 4 : 0) - n * 0.3 })).filter((x: any) => x.s >= 2).sort((a: any, b: any) => b.s - a.s).map((x: any) => x.i)
        : items;
      const rawIds = ranked.map((i: any) => i.id.videoId).slice(0, 50);
      if (!rawIds.length) return json({ ids: [] }, 0);
      const verified = await youtube("videos", { part: "status,contentDetails", id: rawIds.join(",") });
      const ids = playableVideoIds(rawIds, verified.items ?? []);
      if (ids.length) youtubeCache.set(query, { at: Date.now(), ids });
      if (youtubeCache.size > 200) { const first = youtubeCache.keys().next().value; if (first) youtubeCache.delete(first); }
      return json({ ids }, 300);
      } catch (e) { return json({ ids: [], error: e instanceof Error ? e.message : "YouTube unavailable" }, 0); }
    }
  }
  return new Response("Unknown op", { status: 400 });
}

export const Route = createFileRoute("/api/music")({ server: { handlers: { GET: handle } } });
