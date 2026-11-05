import { signOutAll } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useVisit } from "./visit";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/astra/prefs";
import { useLibrary } from "./store";
import { useCatalog } from "./catalog";

export function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 15000); return () => clearInterval(id); }, []);
  return t;
}

export function useConsoleCtx() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {send} = useVisit();
  const { user } = useAuth();
  const lib = useLibrary(user?.id);
  const p = usePrefs();
  const clock = useClock();
  const catalog = useCatalog();
  const go = (to: string) => navigate({ to: to as never });
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = meta?.full_name ?? meta?.name ?? user?.email?.split("@")[0] ?? "Player";
  const signOut = async () => { await queryClient.cancelQueries(); queryClient.clear(); await signOutAll(); send("restart"); navigate({ to: "/auth", replace:true }); };
  return { go, user, lib, p, clock, catalog, name, initial: name[0]?.toUpperCase() ?? "?", signOut };
}
export type ConsoleCtx = ReturnType<typeof useConsoleCtx>;