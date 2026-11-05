import { useEffect, useRef, useState } from "react";
import type { ControlEvent, ScreenFrame } from "@/lib/astra/screen-share";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, LogOut, Send, Ban, Eye, X, UserPlus, MousePointer2, Maximize, Minimize } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDevAccount } from "@/lib/astra/dev-access.functions";
import { broadcastBanCheck, useLiveVisitors, type LiveVisitor } from "./SiteControl";

type Kind = "message" | "pause" | "resume" | "kick" | "ban" | "view" | "unview";
async function send(kind: Kind, target: string | null, message?: string, quiet = false) {
  const { error } = await supabase.from("site_commands").insert({ kind, target, message: message ?? null });
  if (error) { toast.error(error.message.includes("owner") ? "The owner can't be kicked, paused or banned." : "Couldn't send that command."); return false; }
  if (!quiet) toast.success(kind === "message" ? "Message sent" : kind === "kick" ? "Kicked" : kind === "pause" ? "Screen paused" : "Screen resumed");
  return true;
}

async function banDevice(v: LiveVisitor): Promise<void> {
  if (v.owner) { toast.error("The owner can't be banned."); return; }
  if (!confirm(`Ban ${v.name}'s device? They won't be able to use the site until unbanned.`)) return;
  const { error } = await supabase.from("banned_devices").upsert({ device_id: v.deviceId, label: v.name });
  if (error) { toast.error("Couldn't ban that device."); return; }
  if (v.userId) await send("ban", v.userId, undefined, true);
  void broadcastBanCheck();
  toast.success(`${v.name}'s device is banned`);
}

function ScreenViewer({ visitor, onClose }: { visitor: LiveVisitor; onClose: () => void }) {
  const [frame, setFrame] = useState<ScreenFrame | null>(null);
  const [control, setControl] = useState(false);
  const [box, setBox] = useState(0);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  useEffect(() => { const f = () => setFull(document.fullscreenElement === wrapRef.current); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void wrapRef.current?.requestFullscreen?.(); };
  useEffect(() => {
    const id = crypto.randomUUID();
    const ch = supabase.channel(`screen-${id}`).on("broadcast", { event: "frame" }, ({ payload }) => setFrame(payload as ScreenFrame));
    ch.subscribe((s) => { if (s === "SUBSCRIBED") void send("view", visitor.userId, id, true); });
    chRef.current = ch;
    return () => { chRef.current = null; void send("unview", visitor.userId, undefined, true); void supabase.removeChannel(ch); };
  }, [visitor.userId]);
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox(el.clientWidth)); ro.observe(el); return () => ro.disconnect();
  }, [frame !== null]);
  const ctl = (payload: ControlEvent) => { if (control) void chRef.current?.send({ type: "broadcast", event: "control", payload }); };
  const scale = frame && box ? (full ? Math.min(window.innerWidth / frame.w, (window.innerHeight - 90) / frame.h) : box / frame.w) : 1;
  const point = (e: React.MouseEvent) => { const r = boxRef.current!.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) / scale), y: Math.round((e.clientY - r.top) / scale) }; };
  return (
    <div ref={wrapRef} className={`space-y-2 rounded-lg border border-border bg-background p-3 ${full ? "flex flex-col justify-center overflow-hidden" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Watching {visitor.name}{frame ? ` — ${frame.path}` : ""}</p>
        <div className="flex gap-1">
          <Button size="sm" variant={control ? "default" : "secondary"} onClick={() => setControl((c) => !c)}><MousePointer2 />{control ? "Controlling" : "Take control"}</Button>
          <Button size="sm" variant="secondary" onClick={toggleFull}>{full ? <Minimize /> : <Maximize />}{full ? "Exit full screen" : "Full screen"}</Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X />Stop</Button>
        </div>
      </div>
      {frame ? (
        <div ref={boxRef} tabIndex={0} className={`relative ${full ? "mx-auto" : "w-full"} overflow-hidden rounded border border-border outline-none ${control ? "cursor-pointer ring-2 ring-primary" : ""}`}
          style={{ height: frame.h * scale, width: full ? frame.w * scale : undefined, background: frame.bg }}
          onClick={(e) => ctl({ type: "click", ...point(e) })}
          onDoubleClick={() => { if (!control) toggleFull(); }}
          onWheel={(e) => ctl({ type: "scroll", ...point(e), dy: Math.round(e.deltaY) })}
          onKeyDown={(e) => { if (!control) return; e.preventDefault(); if (e.key.length === 1) ctl({ type: "type", text: e.key }); else ctl({ type: "key", key: e.key }); }}>
          <div style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute", pointerEvents: "none" }}>
            {frame.items.map((it, i) => it.img
              ? <img key={i} src={it.img} alt="" style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, objectFit: it.media ? "contain" : "cover", imageRendering: "auto", background: it.media ? "#000" : undefined, borderRadius: it.r }} />
              : <div key={i} style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, background: it.media ? "#111" : it.bg, border: it.bd ? `1px solid ${it.bd}` : undefined, borderRadius: it.r, color: it.c, fontSize: it.fs, fontWeight: it.fw, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", lineHeight: 1.2, display: "flex", alignItems: "center", justifyContent: it.media ? "center" : undefined }}>{it.media ? "▶ protected video / game" : it.t}</div>)}
          </div>
          <button type="button" aria-label={full ? "Exit full screen" : "Full screen"} onClick={(e) => { e.stopPropagation(); toggleFull(); }}
            className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-md bg-background/80 text-foreground shadow backdrop-blur hover:bg-background">
            {full ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      ) : <p className="py-10 text-center text-sm text-muted-foreground">Waiting for their screen…</p>}
      <p className="text-xs text-muted-foreground">{control ? "Click to click for them, scroll to scroll, and type while the screen is selected." : "Updates live. Videos and games show as small live pictures; a few protected ones stay dark."}</p>
    </div>
  );
}

function Bans() {
  const [rows, setRows] = useState<{ device_id: string; label: string | null }[]>([]);
  const load = () => void supabase.from("banned_devices").select("device_id,label").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(load, []);
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">Banned devices</h3><Button size="sm" variant="ghost" onClick={load}>Refresh</Button></div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No banned devices.</p> : (
        <ul className="divide-y divide-border">{rows.map((r) => (
          <li key={r.device_id} className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">{r.label ?? "Device"} <span className="text-xs text-muted-foreground">{r.device_id.slice(0, 8)}</span></span>
            <Button size="sm" variant="secondary" onClick={async () => { await supabase.from("banned_devices").delete().eq("device_id", r.device_id); void broadcastBanCheck(); toast.success("Unbanned"); load(); }}>Unban</Button>
          </li>))}</ul>)}
    </section>
  );
}

function AddDev() {
  const add = useServerFn(createDevAccount);
  const [name, setName] = useState("");
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground">Add a developer account</h3>
      <p className="text-sm text-muted-foreground">It shows up in the hidden code screen and uses the same code.</p>
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await add({ data: { handle: name } }).catch(() => ({ ok: false, error: "Use 2–24 letters, numbers or _" })); if (r.ok) { toast.success(`${name} added`); setName(""); } else toast.error(r.error); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (letters, numbers, _)" maxLength={24} />
        <Button type="submit" disabled={!name.trim()}><UserPlus />Add</Button>
      </form>
    </section>
  );
}

/** Developer-only: who's on the site right now, with messages, screen view, pause, kick and device bans. */
export function LiveVisitorsPanel() {
  const visitors = useLiveVisitors();
  const [text, setText] = useState("");
  const [watching, setWatching] = useState<LiveVisitor | null>(null);
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Active now</h3>
          <span className="text-sm text-muted-foreground">{visitors.length} online</span>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void send("message", null, text.trim()); setText(""); } }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone (or type a pause reason)" maxLength={300} />
          <Button type="submit"><Send />Global</Button>
        </form>
        {watching && <ScreenViewer key={watching.key} visitor={watching} onClose={() => setWatching(null)} />}
        <ul className="divide-y divide-border">
          {visitors.map((v) => (
            <li key={v.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{v.name}{v.owner ? " (Owner)" : ""}</p>
                <p className="truncate text-xs text-muted-foreground">{v.path}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {v.userId && <>
                  <Button size="sm" variant="secondary" onClick={() => setWatching(v)}><Eye />View</Button>
                  <Button size="sm" variant="secondary" onClick={() => { const m = prompt(`Message ${v.name}`); if (m?.trim()) void send("message", v.userId, m.trim()); }}><Send /></Button>
                </>}
                {!v.owner && v.userId && <>
                  <Button size="sm" variant="secondary" onClick={() => void send("pause", v.userId, text.trim() || undefined)}><Pause />Pause</Button>
                  <Button size="sm" variant="secondary" onClick={() => void send("resume", v.userId)}><Play />Resume</Button>
                  <Button size="sm" variant="destructive" onClick={() => void send("kick", v.userId)}><LogOut />Kick</Button>
                </>}
                {!v.owner && v.deviceId && <Button size="sm" variant="destructive" onClick={() => void banDevice(v)}><Ban />Ban</Button>}
                {!v.userId && <span className="self-center text-xs text-muted-foreground">Guest</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Bans />
      <AddDev />
    </div>
  );
}
