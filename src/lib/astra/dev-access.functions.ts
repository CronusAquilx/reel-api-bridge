import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevPin } from "./account-rules";

/** Built-in developer accounts; qais is the site owner. Extra ones are added from the Developer settings. */
const BUILT_IN: Record<string, string> = {
  qais: "qaisdev@gmail.org",
  chance: "chancedev@gmail.com",
  braylen: "braylendev@birchos.dev",
  persius: "persiusdev@birchos.dev",
};
const handleSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,24}$/);
const emailFor = (h: string) => BUILT_IN[h] ?? `${h}dev@birchos.dev`;
const pinOk = (code: string) => isDevPin(code);
const slow = () => new Promise((r) => setTimeout(r, 800)); // slows down guessing

async function allHandles() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("dev_accounts").select("handle").order("created_at");
  return [...Object.keys(BUILT_IN), ...(data ?? []).map((r) => r.handle).filter((h) => !(h in BUILT_IN))];
}

/** Checks the hidden developer panel PIN on the server; returns the account names only after a correct PIN. */
export const checkDevPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().max(32) }).parse(d))
  .handler(async ({ data }) => {
    await slow();
    if (!pinOk(data.code)) return { ok: false, accounts: [] as string[] };
    return { ok: true, accounts: await allHandles() };
  });

/** Hidden developer sign-in: re-checks the PIN server-side and returns a one-time login token for a dev account. */
export const devSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().max(32), account: handleSchema }).parse(d))
  .handler(async ({ data }) => {
    await slow();
    if (!pinOk(data.code)) return { ok: false as const, error: "Wrong code" };
    if (!(await allHandles()).includes(data.account)) return { ok: false as const, error: "Unknown account" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = emailFor(data.account);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let id = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!id) {
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: data.account, username: data.account } });
      if (error || !created.user) return { ok: false as const, error: "Couldn't create the dev account" };
      id = created.user.id;
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: id, role: "admin" }, { onConflict: "user_id,role" });
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link.properties?.hashed_token) return { ok: false as const, error: "Couldn't sign in" };
    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });

/** Developers can add more developer accounts; they appear in the hidden PIN account picker. */
export const createDevAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ handle: handleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isDev } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isDev) return { ok: false, error: "Developers only" };
    if (data.handle in BUILT_IN) return { ok: false, error: "That account already exists" };
    const { error } = await context.supabase.from("dev_accounts").insert({ handle: data.handle });
    return error ? { ok: false, error: error.code === "23505" ? "That account already exists" : "Couldn't add it" } : { ok: true, error: "" };
  });
