import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { handleSchema, socialInput, safeSocialLink } from "./rules";

export const getSocial = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  const results = await Promise.all([
    db.from("social_players").select("user_id,handle,status,allow_requests,share_activity").eq("user_id", context.userId).maybeSingle(),
    db.from("social_friends").select("*"), db.from("social_parties").select("*").order("created_at", { ascending: false }),
    db.from("social_members").select("*"), db.from("social_posts").select("*").order("created_at", { ascending: false }).limit(150),
    db.from("social_blocks").select("*")
  ]);
  for (const result of results) if (result.error) { console.error("Social read failed", result.error.code, result.error.message); throw new Error("Social could not load. Try again."); }
  const [profile, friends, parties, members, posts, blocks] = results;
  const ids = [...new Set([context.userId, ...(friends.data ?? []).flatMap(f => [f.sender_id, f.recipient_id]), ...(members.data ?? []).map(m => m.user_id), ...(posts.data ?? []).map(p => p.user_id), ...(blocks.data ?? []).map(b => b.target_id)])];
  const { data: players, error } = await db.rpc("social_directory", { ids });
  if (error) throw new Error("Players could not load.");
  return { userId: context.userId, profile: profile.data, friends: friends.data ?? [], parties: parties.data ?? [], members: members.data ?? [], posts: posts.data ?? [], blocks: blocks.data ?? [], players: (players ?? []).map(p => ({ ...p, status: p.status === "invisible" ? "offline" : p.status })) };
});

export const socialAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => socialInput.parse(input)).handler(async ({ data, context }) => {
  if (data.action === "profile" || data.action === "request") data.payload["handle"] = handleSchema.parse(data.payload["handle"]);
  if (data.action === "post" && typeof data.payload["link"] === "string" && data.payload["link"] && !safeSocialLink(data.payload["link"])) throw new Error("This destination cannot be shared.");
  const { data: result, error } = await context.supabase.rpc("social_action", data);
  if (error) throw new Error(error.message.includes("duplicate") ? "That handle is already taken." : error.message);
  return result;
});