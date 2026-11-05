import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOutAll } from "@/lib/auth";
import { applyControl, captureFrame, type ControlEvent } from "@/lib/astra/screen-share";
import { visitorCommands } from "@/lib/astra/visitor-commands.functions";
import { TrollLayer } from "./TrollLayer";

export type LiveVisitor = { key: string; deviceId: string; userId: string | null; name: string; path: string; since: string; owner: boolean; idle?: boolean };
export const OWNER_EMAIL = "qaisdev@gmail.org";

let visitors: LiveVisitor[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const useLiveVisitors = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => visitors, () => visitors);

let presence: ReturnType<typeof supabase.channel> | null = null;
/** Asks every tab to re-check whether its device is banned (the server decides). */
export const broadcastBanCheck = () => presence?.send({ type: "broadcast", event: "ban-check", payload: {} });
/** Tells signed-out visitors (one device, or "*" for all) to fetch new commands from the server. */
export const pingDevice = (deviceId: string) => presence?.send({ type: "broadcast", event: "device-ping", payload: { deviceId } });

const tabKey = () => {
  let k = sessionStorage.getItem("birch-tab-key");
  if (!k) { k = crypto.randomUUID(); sessionStorage.setItem("birch-tab-key", k); }
  return k;
};
export const deviceId = () => {
  let k = localStorage.getItem("birch-device-id");
  if (!k) { k = crypto.randomUUID(); localStorage.setItem("birch-device-id", k); }
  return k;
};

type Cmd = { kind: string; message: string | null };

/** Shares this tab's presence and obeys staff commands (message, announce, pause, redirect, reload, kick, ban, screen view). Mounted once at the root. */
export function SiteControl() {
  const { user, guest } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [paused, setPaused] = useState<string | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const [banned, setBanned] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [idle, setIdle] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const owner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const fetchVisitor = useServerFn(visitorCommands);
  const since = useRef(new Date().toISOString());
  const userRef = useRef(user); userRef.current = user;

  const checkBan = () => { void supabase.rpc("is_device_banned", { _device: deviceId() }).then(({ data }) => setBanned(Boolean(data))); };
  useEffect(checkBan, [user]);

  const handle = (cmd: Cmd) => {
    if (cmd.kind === "message") toast(cmd.message ?? "", { description: "Message from the staff", duration: 15000 });
    if (cmd.kind === "announce") setAnnounce(cmd.message || "Announcement");
    if (cmd.kind === "unannounce") setAnnounce(null);
    if (cmd.kind === "view" && cmd.message) setViewing(cmd.message);
    if (cmd.kind === "unview") setViewing(null);
    if (owner) return; // the owner can't be paused, redirected, kicked or banned
    if (cmd.kind === "pause") setPaused(cmd.message || "Your screen was paused by the staff.");
    if (cmd.kind === "resume") setPaused(null);
    if (cmd.kind === "reload") window.location.reload();
    if (cmd.kind === "redirect" && cmd.message && /^\/(?!\/)[^\\\s]*$/.test(cmd.message)) window.location.assign(cmd.message);
    if (cmd.kind === "kick") { void signOutAll().finally(() => window.location.replace("/")); }
    if (cmd.kind === "ban") checkBan();
    if (cmd.kind === "troll" && cmd.message) setTroll(cmd.message);
    if (cmd.kind === "untroll") setTroll(null);
  };
  const [troll, setTroll] = useState<string | null>(null);
  const handleRef = useRef(handle); handleRef.current = handle;

  // Visitor activity (idle after 60s without input) shown to staff.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 60_000); };
    const evs = ["pointerdown", "keydown", "wheel"] as const;
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true })); wake();
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, wake)); };
  }, []);

  useEffect(() => {
    const key = tabKey();
    const ch = supabase.channel("site-presence", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<LiveVisitor>();
      visitors = Object.values(state).map((v) => v[0]).filter((v): v is NonNullable<typeof v> => Boolean(v));
      emit();
    }).on("broadcast", { event: "ban-check" }, checkBan)
      .on("broadcast", { event: "device-ping" }, ({ payload }) => {
        if (userRef.current) return; // signed-in tabs get commands directly
        const d = (payload as { deviceId?: string }).deviceId;
        if (d !== "*" && d !== deviceId()) return;
        void fetchVisitor({ data: { deviceId: deviceId(), since: since.current } }).then((rows) => {
          for (const r of rows) { since.current = r.created_at; handleRef.current(r); }
        }).catch(() => {});
      })
      .subscribe((s) => { if (s === "SUBSCRIBED") { presence = ch; setChannel(ch); } });
    return () => { presence = null; setChannel(null); void supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!channel) return;
    const meta = user?.user_metadata as { username?: string; display_name?: string } | undefined;
    void channel.track({
      key: tabKey(), deviceId: deviceId(), userId: user?.id ?? null, path, since: new Date().toISOString(), owner, idle,
      name: user ? meta?.username ?? meta?.display_name ?? user.email?.split("@")[0] ?? "Player" : guest ? "Guest" : "Visitor",
    });
  }, [channel, user, guest, path, owner, idle]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`site-commands-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_commands" }, ({ new: c }) => {
        const cmd = c as { kind: string; target: string | null; target_device: string | null; message: string | null; created_by: string };
        if (cmd.target_device) { if (cmd.target_device !== deviceId()) return; }
        else if (cmd.target && cmd.target !== user.id) return;
        if (!cmd.target && !cmd.target_device && cmd.created_by === user.id && cmd.kind !== "message" && cmd.kind !== "announce") return;
        handleRef.current(cmd);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  // Live screen share: sends a light layout outline (only when it changes) and accepts remote control.
  const [controlled, setControlled] = useState(false);
  useEffect(() => {
    if (!viewing) return;
    const ch = supabase.channel(`screen-${viewing}`, { config: { broadcast: { ack: false } } });
    let last = ""; let lastSent = 0; let lastControl = 0;
    const tick = () => {
      if (document.hidden) return;
      const frame = captureFrame();
      const json = JSON.stringify(frame);
      if (json === last && Date.now() - lastSent < 10000) return; // nothing changed
      last = json; lastSent = Date.now();
      if (json.length < 300_000) void ch.send({ type: "broadcast", event: "frame", payload: frame });
    };
    ch.on("broadcast", { event: "control" }, ({ payload }) => {
      setControlled(true); lastControl = Date.now();
      applyControl(payload as ControlEvent);
      // Send the result right away (next paint) and once more after animations settle.
      requestAnimationFrame(() => requestAnimationFrame(tick));
      setTimeout(tick, 180);
    }).subscribe();
    const idleTick = () => {
      if (Date.now() - lastControl < 5000) return tick(); // being controlled: skip idle waiting
      if ("requestIdleCallback" in window) requestIdleCallback(tick, { timeout: 300 }); else tick();
    };
    const t = setInterval(idleTick, 300);
    const end = setTimeout(() => setViewing(null), 15 * 60 * 1000);
    idleTick();
    return () => { clearInterval(t); clearTimeout(end); setControlled(false); void supabase.removeChannel(ch); };
  }, [viewing]);

  if (banned) return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-background" role="alertdialog" aria-label="Banned">
      <div className="max-w-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">This device is banned</h2>
        <p className="mt-3 text-muted-foreground">The staff has blocked this device from using the site.</p>
      </div>
    </div>
  );
  return <>
    {troll && !owner && <TrollLayer key={troll} troll={troll} onEnd={() => setTroll(null)} />}
    {viewing && <div data-screen-share="skip" className="fixed bottom-2 left-2 z-[9998] rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground">{controlled ? "Staff is controlling your screen" : "Staff is viewing your screen"}</div>}
    {announce && (
      <div className="fixed inset-x-0 top-0 z-[9997] flex items-center justify-center gap-3 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg" role="status">
        <span>📢 {announce}</span>
        <button type="button" className="rounded px-2 py-0.5 text-xs underline" onClick={() => setAnnounce(null)}>Dismiss</button>
      </div>
    )}
    {paused && (
      <div className="fixed inset-0 z-[9999] grid place-items-center bg-background/95 backdrop-blur-xl" role="alertdialog" aria-label="Screen paused">
        <div className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Screen paused</h2>
          <p className="mt-3 text-muted-foreground">{paused}</p>
        </div>
      </div>
    )}
  </>;
}
