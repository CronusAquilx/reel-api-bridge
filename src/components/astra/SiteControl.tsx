import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOutAll } from "@/lib/auth";
import { applyControl, captureFrame, type ControlEvent } from "@/lib/astra/screen-share";

export type LiveVisitor = { key: string; deviceId: string; userId: string | null; name: string; path: string; since: string; owner: boolean };
export const OWNER_EMAIL = "qaisdev@gmail.org";

let visitors: LiveVisitor[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const useLiveVisitors = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => visitors, () => visitors);

let presence: ReturnType<typeof supabase.channel> | null = null;
/** Asks every tab to re-check whether its device is banned (the server decides). */
export const broadcastBanCheck = () => presence?.send({ type: "broadcast", event: "ban-check", payload: {} });

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

/** Shares this tab's presence and obeys developer commands (message, pause, kick, ban, screen view). Mounted once at the root. */
export function SiteControl() {
  const { user, guest } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [paused, setPaused] = useState<string | null>(null);
  const [banned, setBanned] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const owner = user?.email?.toLowerCase() === OWNER_EMAIL;

  const checkBan = () => { void supabase.rpc("is_device_banned", { _device: deviceId() }).then(({ data }) => setBanned(Boolean(data))); };
  useEffect(checkBan, [user]);

  useEffect(() => {
    const key = tabKey();
    const ch = supabase.channel("site-presence", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<LiveVisitor>();
      visitors = Object.values(state).map((v) => v[0]).filter((v): v is NonNullable<typeof v> => Boolean(v));
      emit();
    }).on("broadcast", { event: "ban-check" }, checkBan)
      .subscribe((s) => { if (s === "SUBSCRIBED") { presence = ch; setChannel(ch); } });
    return () => { presence = null; setChannel(null); void supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!channel) return;
    const meta = user?.user_metadata as { username?: string; display_name?: string } | undefined;
    void channel.track({
      key: tabKey(), deviceId: deviceId(), userId: user?.id ?? null, path, since: new Date().toISOString(), owner,
      name: user ? meta?.username ?? meta?.display_name ?? user.email?.split("@")[0] ?? "Player" : guest ? "Guest" : "Visitor",
    });
  }, [channel, user, guest, path, owner]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`site-commands-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_commands" }, ({ new: c }) => {
        const cmd = c as { kind: string; target: string | null; message: string | null; created_by: string };
        if (cmd.target && cmd.target !== user.id) return;
        if (!cmd.target && cmd.created_by === user.id && cmd.kind !== "message") return;
        if (cmd.kind === "message") toast(cmd.message ?? "", { description: "Message from the developers", duration: 15000 });
        if (cmd.kind === "view" && cmd.message) setViewing(cmd.message);
        if (cmd.kind === "unview") setViewing(null);
        if (owner) return; // the owner can't be paused, kicked or banned
        if (cmd.kind === "pause") setPaused(cmd.message || "Your screen was paused by a developer.");
        if (cmd.kind === "resume") setPaused(null);
        if (cmd.kind === "kick") { void signOutAll().finally(() => window.location.replace("/")); }
        if (cmd.kind === "ban") checkBan();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, owner]);

  // Live screen share: sends a light layout outline (only when it changes) and accepts remote control.
  const [controlled, setControlled] = useState(false);
  useEffect(() => {
    if (!viewing) return;
    const ch = supabase.channel(`screen-${viewing}`);
    let last = ""; let lastSent = 0;
    ch.on("broadcast", { event: "control" }, ({ payload }) => { setControlled(true); applyControl(payload as ControlEvent); setTimeout(() => void tick(), 120); })
      .subscribe();
    const tick = () => {
      if (document.hidden) return;
      const frame = captureFrame();
      const json = JSON.stringify(frame);
      if (json === last && Date.now() - lastSent < 10000) return; // nothing changed
      last = json; lastSent = Date.now();
      if (json.length < 240_000) void ch.send({ type: "broadcast", event: "frame", payload: frame });
    };
    const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(tick, { timeout: 400 }) : tick());
    const t = setInterval(idle, 350);
    const end = setTimeout(() => setViewing(null), 15 * 60 * 1000);
    idle();
    return () => { clearInterval(t); clearTimeout(end); setControlled(false); void supabase.removeChannel(ch); };
  }, [viewing]);

  if (banned) return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-background" role="alertdialog" aria-label="Banned">
      <div className="max-w-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">This device is banned</h2>
        <p className="mt-3 text-muted-foreground">A developer has blocked this device from using the site.</p>
      </div>
    </div>
  );
  return <>
    {viewing && <div data-screen-share="skip" className="fixed bottom-2 left-2 z-[9998] rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground">{controlled ? "A developer is controlling your screen" : "A developer is viewing your screen"}</div>}
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
