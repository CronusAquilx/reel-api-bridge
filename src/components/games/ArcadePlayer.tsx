import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowLeft, Maximize, RotateCw, Wand2, Sparkles, SlidersHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { presetsFor, modsFor, mapReaderFor } from "@/lib/games/mods";
import { HostParty } from "@/components/games/GameParty";
import { AutoMods } from "@/components/games/AutoMods";
import { supabase } from "@/integrations/supabase/client";
import { recordPlay, addSeconds, recordMod, recordParty } from "@/lib/games/stats";
import { setPrefs, usePrefs } from "@/lib/astra/prefs";
import { attachProxiedPopups } from "@/lib/astra/proxy-popups";
import { PerfOverlay } from "@/components/games/PerfOverlay";
import { openProxied } from "@/lib/astra/proxy";
type Game = { id: number; name: string; author: string; file: string; cover: string; url?: string };
export function Player({ game, onBack }: { game: Game; onBack: () => void }) {
  const prefs = usePrefs();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState(0);
  const [launchError, setLaunchError] = useState("");
  useEffect(() => {
    recordPlay(game.name);
    let acc = 0;
    const id = setInterval(() => { if (!document.hidden) acc += 15; if (acc >= 60) { addSeconds(game.name, acc); acc = 0; } }, 15000);
    return () => { clearInterval(id); if (acc) addSeconds(game.name, acc); };
  }, [game.name]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && e.shiftKey && !(e.target instanceof HTMLInputElement)) toggleStats();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mods = useMemo(() => modsFor(game.name), [game.name]);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const sendMods = (state: Record<string, boolean>) => {
    mods.forEach((m) => { try { frame.current?.contentWindow?.postMessage({ bbMod: 1, prop: m.prop, value: state[m.id] ? m.value : null }, "*"); } catch { /* frame gone */ } });
  };
  const toggle = (id: string, v: boolean) => setOn((s) => { const n = { ...s, [id]: v }; sendMods(n); return n; });
  const [speed, setSpeed] = useState(1);
  const sendSpeed = (v: number) => { try { frame.current?.contentWindow?.postMessage({ bbSpeed: 1, value: v }, "*"); } catch { /* frame gone */ } };
  const [save, setSave] = useState<Record<string, string> | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [showStats, setShowStats] = useState(prefs.perfOverlay);
  const toggleStats = () => setShowStats((v) => {
    setPrefs({ perfOverlay: !v });
    return !v;
  });
  const [autoOpen, setAutoOpen] = useState<Record<string, string> | null>(null);
  const applyAuto = async (changes: Record<string, string>) => {
    ignoreSaves.current = Date.now() + 6000;
    const next = { ...saveRef.current, ...changes };
    await persist(next); setSave(next); setAutoOpen(next); setNonce((n) => n + 1);
  };
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const saveRef = useRef<Record<string, string>>({});
  const ignoreSaves = useRef(0);
  const persist = async (data: Record<string, string>) => {
    saveRef.current = data;
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("game_saves").upsert({ user_id: u.user.id, game: game.file, data, updated_at: new Date().toISOString() });
  };
  useEffect(() => {
    let live = true;
    setSave(null);
    supabase.from("game_saves").select("data").eq("game", game.file).maybeSingle().then(({ data }) => {
      if (!live) return;
      const d = (data?.data ?? {}) as Record<string, string>;
      saveRef.current = d; setSave(d);
    });
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || e.data.bbSave !== 1) return;
      if (Date.now() < ignoreSaves.current) return; // old frame flushing its pre-mod save
      const d = e.data.data;
      if (d && typeof d === "object" && JSON.stringify(d).length < 2_000_000) void persist(d);
    };
    window.addEventListener("message", onMsg);
    return () => { live = false; window.removeEventListener("message", onMsg); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.file]);
  const runAi = async () => {
    setAiBusy(true); setAiMsg("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/game-ai", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ game: game.name, prompt: aiText, save: saveRef.current }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setAiMsg(j.error ?? "Couldn't make that mod"); return; }
      ignoreSaves.current = Date.now() + 6000;
      const next = { ...saveRef.current, ...j.changes };
      recordMod();
      await persist(next); setSave(next); setNonce((n) => n + 1);
      setAiMsg("Mod applied! The game reloaded with it."); setAiText("");
    } finally { setAiBusy(false); }
  };
  const qs = new URLSearchParams();
  const props = mods.filter((m) => !m.prop.startsWith("map:")).map((m) => m.prop);
  if (props.length) qs.set("mods", props.join(","));
  const mr = mapReaderFor(game.name);
  if (mr) { qs.set("mapfn", mr.fn); qs.set("probe", mr.probe); }
  const src = `/api/public/games/play/${game.file}${qs.size ? `?${qs}` : ""}`;
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const detach = attachProxiedPopups(iframe, game.url ?? new URL(src, window.location.origin).href, prefs);
    let live = true; setLaunchError("");
    if (game.url) void openProxied(iframe, game.url, { ...prefs, proxyGames: true }).catch(e => { if (live) setLaunchError(e instanceof Error ? e.message : "Couldn't launch game"); });
    return () => { live = false; detach(); };
  }, [src, game.url, nonce, save === null, prefs.transport, prefs.wisp]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button onClick={onBack} className="rounded-md border p-1.5" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <p className="truncate font-medium">{game.name}</p>
        <div className="ml-auto flex gap-2">
          {mods.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm" aria-label="Mod menu"><Wand2 className="size-4" /> Mods</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mod menu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {mods.map((m) => (
                  <DropdownMenuCheckboxItem key={m.id} checked={!!on[m.id]} onCheckedChange={(v) => toggle(m.id, !!v)} onSelect={(e) => e.preventDefault()}>{m.label}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <select value={speed} onChange={(e) => { const v = Number(e.target.value); setSpeed(v); sendSpeed(v); }} className="rounded-md border bg-background px-2 py-1.5 text-sm" aria-label="Game speed">
            {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((v) => <option key={v} value={v}>{v}x speed</option>)}
          </select>
          <button onClick={() => setAutoOpen((v) => (v ? null : { ...saveRef.current }))} className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm" aria-label="Auto mod menu"><SlidersHorizontal className="size-4" /> Auto mods</button>
          <button onClick={() => setAiOpen((v) => !v)} className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm" aria-label="AI mod maker"><Sparkles className="size-4" /> AI mod</button>
          <span className="contents" onClickCapture={() => recordParty()}><HostParty game={game} wrap={wrap} frame={frame} /></span>
          <button onClick={toggleStats} className={`rounded-md border p-1.5 ${showStats ? "bg-muted" : ""}`} aria-label="Performance overlay" aria-pressed={showStats} title="FPS, ping and memory (Shift+F)"><Activity className="size-4" /></button>
          <button onClick={() => setNonce((n) => n + 1)} className="rounded-md border p-1.5" aria-label="Reload"><RotateCw className="size-4" /></button>
          <button onClick={() => wrap.current?.requestFullscreen?.()} className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm" aria-label="Fullscreen">
            <Maximize className="size-4" /> Fullscreen
          </button>
        </div>
      </div>
      {autoOpen && <div className="border-b px-3 py-2"><AutoMods game={game.name} save={autoOpen} onApply={(c) => void applyAuto(c)} /></div>}
      {aiOpen && (
        <form onSubmit={(e) => { e.preventDefault(); if (aiText.trim() && !aiBusy) void runAi(); }} className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <input value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Describe a mod, e.g. give me 1,000,000 coins" className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm" />
          <button disabled={aiBusy || !aiText.trim()} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">{aiBusy ? "Making…" : "Make mod"}</button>
          {presetsFor(game.name).length > 0 && <div className="flex w-full flex-wrap gap-1">{presetsFor(game.name).map((p) => <button type="button" key={p} onClick={() => setAiText(p)} className="rounded-full border px-2 py-0.5 text-xs">{p}</button>)}</div>}
          {aiMsg && <p className="w-full text-xs text-muted-foreground">{aiMsg}</p>}
        </form>
      )}
      {launchError && <p role="alert" className="p-3 text-sm text-destructive">{launchError}</p>}
      <div ref={wrap} className="relative min-h-0 flex-1 overflow-hidden bg-background [contain:strict]">
        {save === null ? <p className="p-4 text-sm text-muted-foreground">Loading your save…</p> : <iframe name={`bbsave:${JSON.stringify(saveRef.current)}`} ref={frame} key={nonce} title={game.name} src={game.url ? undefined : src} onLoad={() => { sendMods(on); sendSpeed(speed); }}
          sandbox={game.url ? undefined : "allow-scripts allow-pointer-lock allow-forms allow-modals allow-orientation-lock allow-popups allow-downloads allow-presentation"}
          allow="fullscreen; autoplay; gamepad; keyboard-map; clipboard-write" allowFullScreen className="h-full w-full border-0" />}
        <PerfOverlay frame={frame} visible={showStats && save !== null} onClose={toggleStats} />
      </div>
    </div>
  );
}

