import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Signed-out visitors can't read commands directly; they fetch the ones aimed at their device (or everyone) after a ping. */
export const visitorCommands = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ deviceId: z.string().uuid(), since: z.string().datetime() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("site_commands")
      .select("id,kind,message,created_at,target,target_device")
      .gt("created_at", data.since)
      .is("target", null)
      .or(`target_device.eq.${data.deviceId},target_device.is.null`)
      .order("created_at", { ascending: true })
      .limit(10);
    return (rows ?? []).filter((r) => r.target_device || r.kind === "message" || r.kind === "announce" || r.kind === "unannounce")
      .map(({ id, kind, message, created_at }) => ({ id, kind, message, created_at }));
  });
