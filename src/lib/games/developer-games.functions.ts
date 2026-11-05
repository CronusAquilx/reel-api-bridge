import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { developerGameSchema, requireDeveloper, type DeveloperGame } from "./developer-game-schema";

export const listDeveloperGames = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("developer_games").select("id,name,kind,url").order("created_at");
  if (error) throw new Error("Couldn't load added games.");
  return (data ?? []) as DeveloperGame[];
});
export const developerGameAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return !error && data === true;
});
export const addDeveloperGame = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => developerGameSchema.parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireDeveloper(!role.error && role.data === true);
  const result = await context.supabase.from("developer_games").insert({ ...data, created_by: context.userId }).select("id,name,kind,url").single();
  if (result.error) throw new Error(result.error.code === "23505" ? "That game URL is already added in this section." : "Couldn't add the game.");
  return result.data;
});
export const removeDeveloperGame = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => input).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireDeveloper(!role.error && role.data === true);
  const result = await context.supabase.from("developer_games").delete().eq("id", data.id);
  if (result.error) throw new Error("Couldn't remove the game.");
  return { ok: true };
});