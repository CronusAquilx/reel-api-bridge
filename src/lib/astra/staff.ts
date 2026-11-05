import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type StaffRole = "owner" | "developer" | "admin" | "moderator" | "helper";
export const STAFF_ROLE_INFO: Record<"admin" | "moderator" | "helper", { label: string; can: string }> = {
  admin: { label: "Admin", can: "Everything: view, control, message, pause, redirect, kick and ban" },
  moderator: { label: "Moderator", can: "View, control, message, pause, announce, reload and redirect" },
  helper: { label: "Helper", can: "View screens and send messages" },
};

const MOD_KINDS = ["message", "pause", "resume", "view", "unview", "announce", "unannounce", "reload", "redirect", "control", "panel"];
const HELPER_KINDS = ["message", "view", "unview", "panel"];

/** Client-side mirror of the database's staff_can() — only hides buttons; the database enforces the real rule. */
export function roleCan(role: StaffRole | null, kind: string) {
  if (!role) return false;
  if (role === "owner" || role === "developer" || role === "admin") return true;
  return (role === "moderator" ? MOD_KINDS : HELPER_KINDS).includes(kind);
}

export function useStaffRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StaffRole | null> => {
      const [{ data: owner }, { data: dev }, { data: row }] = await Promise.all([
        supabase.rpc("is_site_owner", { _uid: user!.id }),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
        supabase.from("staff_roles").select("role").eq("user_id", user!.id).maybeSingle(),
      ]);
      if (owner) return "owner";
      if (dev) return "developer";
      return (row?.role as StaffRole | undefined) ?? null;
    },
  });
}
