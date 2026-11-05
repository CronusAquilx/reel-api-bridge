import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOutAll } from "@/lib/auth";

export type LiveVisitor = { key: string; userId: string | null; name: string; path: string; since: string };

let visitors: LiveVisitor[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const useLiveVisitors = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => visitors, () => visitors);

const tabKey = () => {
  let k = sessionStorage.getItem("birch-tab-key");
  if (!k) { k = crypto.randomUUID(); sessionStorage.setItem("birch-tab-key", k); }
  return k;
};

/** Shares this tab's presence and obeys developer commands (message, pause, kick). Mounted once at the root. */
export function SiteControl() {
  const { user, guest } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [paused, setPaused] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const key = tabKey();
    const ch = supabase.channel("site-presence", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<LiveVisitor>();
      visitors = Object.values(state).map((v) => v[0]).filter((v): v is NonNullable<typeof v> => Boolean(v));
      emit();
    }).subscribe((s) => { if (s === "SUBSCRIBED") setChannel(ch); });
    return () => { setChannel(null); void supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!channel) return;
    const meta = user?.user_metadata as { username?: string; display_name?: string } | undefined;
    void channel.track({
      key: tabKey(), userId: user?.id ?? null, path, since: new Date().toISOString(),
      name: user ? meta?.username ?? meta?.display_name ?? user.email?.split("@")[0] ?? "Player" : guest ? "Guest" : "Visitor",
    });
  }, [channel, user, guest, path]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`site-commands-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "site_commands" }, ({ new: c }) => {
        const cmd = c as { kind: string; target: string | null; message: string | null; created_by: string };
        if (cmd.target && cmd.target !== user.id) return;
        if (!cmd.target && cmd.created_by === user.id && cmd.kind !== "message") return;
        if (cmd.kind === "message") toast(cmd.message ?? "", { description: "Message from the developers", duration: 15000 });
        if (cmd.kind === "pause") setPaused(cmd.message || "Your screen was paused by a developer.");
        if (cmd.kind === "resume") setPaused(null);
        if (cmd.kind === "kick") { void signOutAll().finally(() => window.location.replace("/")); }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  if (!paused) return null;
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-background/95 backdrop-blur-xl" role="alertdialog" aria-label="Screen paused">
      <div className="max-w-md p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Screen paused</h2>
        <p className="mt-3 text-muted-foreground">{paused}</p>
      </div>
    </div>
  );
}
