import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountEmail, isDeveloperHandle, loginSchema, signupSchema } from "./account-rules";

export const usernameSignIn = createServerFn({ method: "POST" }).inputValidator(input => loginSchema.parse(input)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip = getRequest().headers.get("cf-connecting-ip") ?? "preview";
  const allowed = await supabaseAdmin.rpc("allow_account_attempt", { _bucket: `login:${ip}:${data.username}` });
  const globalAllowed = await supabaseAdmin.rpc("allow_account_attempt", { _bucket: `login-ip:${ip}` });
  if (allowed.error || !allowed.data || globalAllowed.error || !globalAllowed.data) throw new Error("Too many attempts. Try again in 15 minutes.");
  let email = data.username.includes("@") ? data.username : accountEmail(data.username);
  if (!data.username.includes("@")) {
    const profile = await supabaseAdmin.from("profiles").select("id").eq("username", data.username).maybeSingle();
    if (profile.data) {
      const account = await supabaseAdmin.auth.admin.getUserById(profile.data.id);
      email = account.data.user?.email ?? email;
    }
  }
  const url = process.env["SUPABASE_URL"]; const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Sign-in is unavailable right now.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key); return fetch(input, { ...init, headers });
  } } });
  const result = await client.auth.signInWithPassword({ email, password: data.password });
  if (result.error || !result.data.session) throw new Error("Username or password is incorrect.");
  return { access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token };
});

export const usernameSignUp = createServerFn({ method: "POST" }).inputValidator(input => signupSchema.parse(input)).handler(async ({ data }) => {
  if (isDeveloperHandle(data.username)) throw new Error("That username is unavailable.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip = getRequest().headers.get("cf-connecting-ip") ?? "preview";
  const allowed = await supabaseAdmin.rpc("allow_account_attempt", { _bucket: `signup:${ip}` });
  if (allowed.error || !allowed.data) throw new Error("Too many attempts. Try again in 15 minutes.");
  const email = accountEmail(data.username);
  // Only the internal, non-deliverable identity is confirmed. Optional contact email is never an auth identity or privilege signal.
  const result = await supabaseAdmin.auth.admin.createUser({ email, password: data.password, email_confirm: true, user_metadata: { name: data.username } });
  if (result.error || !result.data.user) throw new Error("That username is unavailable, or the password does not meet account requirements.");
  const profile = await supabaseAdmin.from("profiles").update({ contact_email: data.email || null }).eq("id", result.data.user.id);
  if (profile.error) throw new Error("Account created, but contact email could not save. You can sign in now.");
  return { ok: true };
});

export const accountSetupStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from("profiles").select("onboarding_complete").eq("id", context.userId).single();
  if (result.error) throw new Error("Couldn't check account setup.");
  return result.data.onboarding_complete;
});
export const finishAccountSetup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from("profiles").update({ onboarding_complete: true }).eq("id", context.userId);
  if (result.error) throw new Error("Couldn't save account setup.");
  return { ok: true };
});