import { useEffect, useMemo, useRef, useState } from "react";
import type { ControlEvent, ScreenFrame } from "@/lib/astra/screen-share";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, LogOut, Send, Ban, Eye, X, UserPlus, MousePointer2, Maximize, Minimize, Megaphone, RotateCw, Navigation, Search, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDevAccount } from "@/lib/astra/dev-access.functions";
import { roleCan, STAFF_ROLE_INFO, useStaffRole, type StaffRole } from "@/lib/astra/staff";
import { TROLLS, youtubeId } from "./TrollLayer";
import { broadcastBanCheck, pingDevice, useLiveVisitors, type LiveVisitor } from "./SiteControl";

type Kind = "message" | "pause" | "resume" | "kick" | "ban" | "view" | "unview" | "redirect" | "reload" | "announce" | "unannounce" | "troll" | "untroll";

function TrollMenu({ to, name }: { to: Target; name: string }) {
  const [open, setOpen] = useState(false);
  const fire = (t: string) => { void send("troll", to, t, true).then((ok) => ok && toast.success(`Trolling ${name}`)); };
  return <>
    <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>😈 Troll</Button>
    {open && <div className="basis-full flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-2">
      {TROLLS.map((t) => <Button key={t.id} size="sm" variant="outline" onClick={() => fire(t.id)}>{t.emoji} {t.label}</Button>)}
      <Button size="sm" variant="outline" onClick={() => { const u = prompt("YouTube link to play full screen"); const id = u ? youtubeId(u) : null; if (id) fire(`video:${id}`); else if (u) toast.error("That isn't a YouTube link."); }}>📺 YouTube video</Button>
      <Button size="sm" variant="destructive" onClick={() => void send("untroll", to, undefined, true).then((ok) => ok && toast.success("Troll stopped"))}>Stop trolling</Button>
    </div>}
  </>;
}
type Target = { userId: string | null; deviceId?: string | null } | null;
const DONE: Partial<Record<Kind, string>> = { message: "Message sent", kick: "Kicked", pause: "Screen paused", resume: "Screen resumed", redirect: "Sent to page", reload: "Reloaded", announce: "Announcement shown", unannounce: "Announcement cleared" };

async function send(kind: Kind, to: Target, message?: string, quiet = false) {
  const userId = to?.userId ?? null;
  const device = !userId && to?.deviceId ? to.deviceId : null;
  const { error } = await supabase.from("site_commands").insert({ kind, target: userId, target_device: device, message: message ?? null });
  if (error) {
    toast.error(error.message.includes("owner") ? error.message.includes("admin") ? "Only the owner can do that to an admin." : "The owner can't be kicked, paused or banned." : "You don't have permission for that.");
    return false;
  }
  if (!userId) void pingDevice(device ?? "*");
  if (!quiet && DONE[kind]) toast.success(DONE[kind]!);
  return true;
}
const target = (v: LiveVisitor): Target => ({ userId: v.userId, deviceId: v.deviceId });

async function banDevice(v: LiveVisitor): Promise<void> {
  if (v.owner) { toast.error("The owner can't be banned."); return; }
  if (!confirm(`Ban ${v.name}'s device? They won't be able to use the site until unbanned.`)) return;
  const { error } = await supabase.from("banned_devices").upsert({ device_id: v.deviceId, label: v.name });
  if (error) { toast.error("Couldn't ban that device."); return; }
  if (v.userId) await send("ban", target(v), undefined, true);
  void broadcastBanCheck();
  toast.success(`${v.name}'s device is banned`);
}

function ScreenViewer({ visitor, canControl, onClose }: { visitor: LiveVisitor; canControl: boolean; onClose: () => void }) {
  const [frame, setFrame] = useState<ScreenFrame | null>(null);
  const [control, setControl] = useState(false);
  const [box, setBox] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  useEffect(() => { const f = () => setFull(document.fullscreenElement === wrapRef.current); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void wrapRef.current?.requestFullscreen?.(); };
  useEffect(() => {
    const id = crypto.randomUUID();
    const to = target(visitor);
    const ch = supabase.channel(`screen-${id}`, { config: { broadcast: { ack: false } } }).on("broadcast", { event: "frame" }, ({ payload }) => setFrame(payload as ScreenFrame));
    ch.subscribe((s) => { if (s === "SUBSCRIBED") void send("view", to, id, true); });
    chRef.current = ch;
    return () => { chRef.current = null; void send("unview", to, undefined, true); void supabase.removeChannel(ch); };
  }, [visitor.userId, visitor.deviceId]);
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setBox(el.clientWidth)); ro.observe(el); return () => ro.disconnect();
  }, [frame !== null]);
  const ctl = (payload: ControlEvent) => { if (control) void chRef.current?.send({ type: "broadcast", event: "control", payload }); };
  const scale = frame && box ? (full ? Math.min(window.innerWidth / frame.w, (window.innerHeight - 90) / frame.h) : box / frame.w) : 1;
  const point = (e: React.MouseEvent) => { const r = boxRef.current!.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) / scale), y: Math.round((e.clientY - r.top) / scale) }; };
  const click = (e: React.MouseEvent) => {
    if (!control) return;
    const p = point(e); ctl({ type: "click", ...p });
    const id = Date.now(); setRipples((r) => [...r, { id, ...p }]); setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 500);
  };
  return (
    <div ref={wrapRef} className={`space-y-2 rounded-lg border border-border bg-background p-3 ${full ? "flex flex-col justify-center overflow-hidden" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Watching {visitor.name}{frame ? ` — ${frame.path}` : ""}</p>
        <div className="flex gap-1">
          {canControl && <Button size="sm" variant={control ? "default" : "secondary"} onClick={() => { setControl((c) => !c); boxRef.current?.focus(); }}><MousePointer2 />{control ? "Controlling" : "Take control"}</Button>}
          <Button size="sm" variant="secondary" onClick={toggleFull}>{full ? <Minimize /> : <Maximize />}{full ? "Exit full screen" : "Full screen"}</Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X />Stop</Button>
        </div>
      </div>
      {frame ? (
        <div ref={boxRef} tabIndex={0} className={`relative ${full ? "mx-auto" : "w-full"} overflow-hidden rounded border border-border outline-none ${control ? "cursor-pointer ring-2 ring-primary" : ""}`}
          style={{ height: frame.h * scale, width: full ? frame.w * scale : undefined, background: frame.bg }}
          onClick={click}
          onDoubleClick={() => { if (!control) toggleFull(); }}
          onWheel={(e) => ctl({ type: "scroll", ...point(e), dy: Math.round(e.deltaY) })}
          onKeyDown={(e) => { if (!control) return; e.preventDefault(); if (e.key.length === 1) ctl({ type: "type", text: e.key }); else ctl({ type: "key", key: e.key }); }}>
          <div style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute", pointerEvents: "none" }}>
            {frame.items.map((it, i) => it.img
              ? <img key={i} src={it.img} alt="" style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, objectFit: it.media || it.icon ? "contain" : "cover", background: it.media ? "#000" : it.bg, borderRadius: it.r }} />
              : <div key={i} style={{ position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h, background: it.media ? "#111" : it.bg, border: it.bd ? `1px solid ${it.bd}` : undefined, borderRadius: it.r, color: it.c, fontSize: it.fs, fontWeight: it.fw, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", lineHeight: 1.2, display: "flex", alignItems: "center", justifyContent: it.media ? "center" : undefined }}>{it.media ? "▶ protected video / game" : it.t}</div>)}
            {ripples.map((r) => <span key={r.id} className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/60" style={{ left: r.x, top: r.y }} />)}
          </div>
          <button type="button" aria-label={full ? "Exit full screen" : "Full screen"} onClick={(e) => { e.stopPropagation(); toggleFull(); }}
            className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-md bg-background/80 text-foreground shadow backdrop-blur hover:bg-background">
            {full ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      ) : <p className="py-10 text-center text-sm text-muted-foreground">Waiting for their screen…</p>}
      <p className="text-xs text-muted-foreground">{control ? "Click to click for them, scroll to scroll, and type while the screen is selected." : "Updates live, including icons. Videos and games show as live pictures; a few protected ones stay dark."}</p>
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

function ActivityLog() {
  const [rows, setRows] = useState<{ id: string; kind: string; message: string | null; created_at: string; target: string | null; target_device: string | null }[]>([]);
  const load = () => void supabase.from("site_commands").select("id,kind,message,created_at,target,target_device").not("kind", "in", "(view,unview)").order("created_at", { ascending: false }).limit(25).then(({ data }) => setRows(data ?? []));
  useEffect(load, []);
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">Recent staff actions</h3><Button size="sm" variant="ghost" onClick={load}>Refresh</Button></div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
        <ul className="max-h-64 divide-y divide-border overflow-auto text-sm">{rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 py-1.5">
            <span className="truncate text-foreground"><b className="capitalize">{r.kind}</b> {r.target || r.target_device ? "→ one person" : "→ everyone"}{r.message ? ` · ${r.message}` : ""}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</span>
          </li>))}</ul>)}
    </section>
  );
}

function StaffRoles({ visitors }: { visitors: LiveVisitor[] }) {
  const [rows, setRows] = useState<{ user_id: string; role: string; label: string | null }[]>([]);
  const load = () => void supabase.from("staff_roles").select("user_id,role,label").order("created_at").then(({ data }) => setRows(data ?? []));
  useEffect(load, []);
  const signedIn = visitors.filter((v, i, a) => v.userId && !v.owner && a.findIndex((x) => x.userId === v.userId) === i);
  const set = async (userId: string, label: string, role: string) => {
    if (role === "none") await supabase.from("staff_roles").delete().eq("user_id", userId);
    else { const { error } = await supabase.from("staff_roles").upsert({ user_id: userId, role, label }); if (error) { toast.error("Only the owner can set roles."); return; } }
    toast.success(role === "none" ? `${label} is no longer staff` : `${label} is now ${STAFF_ROLE_INFO[role as keyof typeof STAFF_ROLE_INFO].label}`); load();
  };
  const picker = (userId: string, label: string, value: string) => (
    <select className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground" value={value} onChange={(e) => void set(userId, label, e.target.value)}>
      <option value="none">No role</option>
      {Object.entries(STAFF_ROLE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold text-foreground"><Shield className="h-4 w-4" />Staff roles (owner only)</h3>
      <ul className="space-y-1 text-xs text-muted-foreground">{Object.values(STAFF_ROLE_INFO).map((r) => <li key={r.label}><b className="text-foreground">{r.label}:</b> {r.can}</li>)}</ul>
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Current staff</p>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No staff yet.</p> : <ul className="divide-y divide-border">{rows.map((r) => (
          <li key={r.user_id} className="flex items-center justify-between gap-2 py-1.5"><span className="text-sm text-foreground">{r.label ?? r.user_id.slice(0, 8)}</span>
            <span className="flex gap-1">{picker(r.user_id, r.label ?? "User", r.role)}<Button size="sm" variant="ghost" aria-label="Remove" onClick={() => void set(r.user_id, r.label ?? "User", "none")}><Trash2 /></Button></span></li>))}</ul>}
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">Give a role to someone online</p>
        {signedIn.length === 0 ? <p className="text-sm text-muted-foreground">Nobody signed in is online.</p> : <ul className="divide-y divide-border">{signedIn.map((v) => (
          <li key={v.userId} className="flex items-center justify-between py-1.5"><span className="text-sm text-foreground">{v.name}</span>{picker(v.userId!, v.name, rows.find((r) => r.user_id === v.userId)?.role ?? "none")}</li>))}</ul>}
      </div>
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

/** Staff panel: who's on the site, with screen view/control, messages, announcements, redirects, pause, kick, bans and roles — buttons follow the viewer's role. */
export function LiveVisitorsPanel() {
  const all = useLiveVisitors();
  const { data: role } = useStaffRole();
  const can = (k: string) => roleCan(role ?? null, k);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [watching, setWatching] = useState<LiveVisitor | null>(null);
  const visitors = useMemo(() => all.filter((v) => !q || `${v.name} ${v.path}`.toLowerCase().includes(q.toLowerCase())), [all, q]);
  const msg = text.trim();
  if (!role) return null;
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Active now <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize text-secondary-foreground">{role}</span></h3>
          <span className="text-sm text-muted-foreground">{all.length} online · {all.filter((v) => v.userId).length} signed in</span>
        </div>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message, announcement, pause reason or page (e.g. /desktop)" maxLength={300} />
        <div className="flex flex-wrap gap-1">
          {can("message") && <Button size="sm" disabled={!msg} onClick={() => { void send("message", null, msg); setText(""); }}><Send />Message all</Button>}
          {can("announce") && <><Button size="sm" variant="secondary" disabled={!msg} onClick={() => void send("announce", null, msg)}><Megaphone />Announce</Button>
            <Button size="sm" variant="ghost" onClick={() => void send("unannounce", null)}>Clear announcement</Button></>}
          {can("pause") && <><Button size="sm" variant="secondary" onClick={() => confirm("Pause everyone?") && void send("pause", null, msg || undefined)}><Pause />Pause all</Button>
            <Button size="sm" variant="secondary" onClick={() => void send("resume", null)}><Play />Resume all</Button></>}
          {can("reload") && <Button size="sm" variant="secondary" onClick={() => confirm("Reload everyone's page?") && void send("reload", null)}><RotateCw />Reload all</Button>}
        </div>
        <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find someone by name or page" /></div>
        {watching && <ScreenViewer key={watching.key} visitor={watching} canControl={can("control")} onClose={() => setWatching(null)} />}
        <ul className="divide-y divide-border">
          {visitors.map((v) => {
            const to = target(v); const blocked = v.owner && role !== "owner";
            return (
              <li key={v.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${v.idle ? "bg-muted-foreground" : "bg-primary"}`} />{v.name}{v.owner ? " (Owner)" : ""}{!v.userId ? " · not signed in" : ""}</p>
                  <p className="truncate text-xs text-muted-foreground">{v.path}{v.idle ? " · idle" : ""}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {can("view") && <Button size="sm" variant="secondary" onClick={() => setWatching(v)}><Eye />View</Button>}
                  {can("message") && <Button size="sm" variant="secondary" aria-label="Message" onClick={() => { const m = prompt(`Message ${v.name}`); if (m?.trim()) void send("message", to, m.trim()); }}><Send />Message</Button>}
                  {!blocked && !v.owner && <>
                    {can("redirect") && <Button size="sm" variant="secondary" onClick={() => { const p = prompt(`Send ${v.name} to which page?`, msg.startsWith("/") ? msg : "/"); if (p && /^\/(?!\/)/.test(p)) void send("redirect", to, p); }}><Navigation />Send to</Button>}
                    {can("reload") && <Button size="sm" variant="secondary" aria-label="Reload" onClick={() => void send("reload", to)}><RotateCw />Reload</Button>}
                    {can("pause") && <><Button size="sm" variant="secondary" onClick={() => void send("pause", to, msg || undefined)}><Pause />Pause</Button>
                      <Button size="sm" variant="secondary" onClick={() => void send("resume", to)}><Play />Resume</Button></>}
                    {can("kick") && v.userId && <Button size="sm" variant="destructive" onClick={() => void send("kick", to)}><LogOut />Kick</Button>}
                    {can("ban") && v.deviceId && <Button size="sm" variant="destructive" onClick={() => void banDevice(v)}><Ban />Ban</Button>}
                    {can("troll") && <TrollMenu to={to} name={v.name} />}
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {role === "owner" && <StaffRoles visitors={all} />}
      <ActivityLog />
      {can("ban") && <Bans />}
      {(role === "owner" || role === "developer") && <AddDev />}
    </div>
  );
}

export type { StaffRole };
