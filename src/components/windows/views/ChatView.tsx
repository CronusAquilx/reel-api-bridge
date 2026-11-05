import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { setPending } from "@/lib/astra/data";
import { Composer } from "@/components/astra/Composer";
import { MobileMenuButton } from "@/components/astra/AppShell";
import { AstraMark } from "@/components/astra/Mark";
import { Button } from "@/components/ui/button";
import { Code2, Film, Music, Gamepad2, Bot } from "lucide-react";
import { usePrefs } from "@/lib/astra/prefs";



export function ChatView() {
  const prefs = usePrefs();
  const native = prefs.layout === "windows" || prefs.console === "sony" || prefs.console === "series";
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modelId, setModelId] = useState("astra");
  const [reasoning, setReasoning] = useState("medium");
  const [busy, setBusy] = useState(false);

  async function start(text: string, files?: import("ai").FileUIPart[]) {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("threads")
      .insert({ user_id: user.id, model_id: modelId, reasoning })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) { toast.error("Couldn't start a chat"); return; }
    setPending({ threadId: data.id, text, ...(files ? { files } : {}) });
    qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
  }

  const name = user?.user_metadata?.["full_name"]?.split(" ")[0] ?? user?.email?.split("@")[0];

  return (
    <div className="ai-application flex h-full flex-col sky">
      <header className="flex h-12 items-center px-3 md:hidden">
        <MobileMenuButton />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center animate-rise">
            <AstraMark className="mx-auto size-7" />
            <h1 className="mt-4 font-display text-4xl md:text-5xl">
              Good to see you{name ? <>, <em>{name}</em></> : ""}.
            </h1>
          </div>
          {native && <div className="ai-workspace-actions">{[{icon:Gamepad2,label:"Game night",prompt:"Suggest a fun browser game night for a party of friends."},{icon:Film,label:"Movie picks",prompt:"Help me choose a movie to watch tonight. Ask me what I like."},{icon:Music,label:"Music discovery",prompt:"Help me discover new music based on my taste."},{icon:Code2,label:"Create something",prompt:"Help me brainstorm a creative project I can start today."}].map(a => <Button key={a.label} variant="secondary" disabled={busy} onClick={() => void start(a.prompt)}><a.icon/><span>{a.label}</span></Button>)}</div>}
          <Composer
            onSend={start}
            busy={busy}
            modelId={modelId}
            reasoning={reasoning}
            onModel={setModelId}
            onReasoning={setReasoning}
          />
          {native && <div className="ai-workspace-status"><Bot className="size-3.5"/><span>BirchBlock AI</span></div>}
        </div>
      </div>
    </div>
  );
}
