import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, LogOut, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveVisitors } from "./SiteControl";

async function send(kind: "message" | "pause" | "resume" | "kick", target: string | null, message?: string) {
  const { error } = await supabase.from("site_commands").insert({ kind, target, message: message ?? null });
  if (error) toast.error("Couldn't send that command.");
  else toast.success(kind === "message" ? "Message sent" : kind === "kick" ? "Kicked" : kind === "pause" ? "Screen paused" : "Screen resumed");
}

/** Developer-only: who's on the site right now, with global messages, pause and kick. */
export function LiveVisitorsPanel() {
  const visitors = useLiveVisitors();
  const [text, setText] = useState("");
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Active now</h3>
        <span className="text-sm text-muted-foreground">{visitors.length} online</span>
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void send("message", null, text.trim()); setText(""); } }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone (or type a pause reason)" maxLength={300} />
        <Button type="submit"><Send />Global</Button>
      </form>
      <ul className="divide-y divide-border">
        {visitors.map((v) => (
          <li key={v.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{v.name}</p>
              <p className="truncate text-xs text-muted-foreground">{v.path}</p>
            </div>
            {v.userId ? (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => { const m = prompt(`Message ${v.name}`); if (m?.trim()) void send("message", v.userId, m.trim()); }}><Send /></Button>
                <Button size="sm" variant="secondary" onClick={() => void send("pause", v.userId, text.trim() || undefined)}><Pause />Pause</Button>
                <Button size="sm" variant="secondary" onClick={() => void send("resume", v.userId)}><Play />Resume</Button>
                <Button size="sm" variant="destructive" onClick={() => void send("kick", v.userId)}><LogOut />Kick</Button>
              </div>
            ) : <span className="text-xs text-muted-foreground">Guest — not signed in</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
