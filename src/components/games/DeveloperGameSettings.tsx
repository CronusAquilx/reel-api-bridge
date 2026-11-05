import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeveloperGames, useDeveloperGameAccess } from "@/lib/games/developer-games";
import { addDeveloperGame, removeDeveloperGame } from "@/lib/games/developer-games.functions";

export function DeveloperGameSettings() {
  const { data: allowed } = useDeveloperGameAccess();
  return allowed ? <GameEditor/> : null;
}
function GameEditor() {
  const { data: games = [], error } = useDeveloperGames();
  const client = useQueryClient();
  const add = useServerFn(addDeveloperGame); const remove = useServerFn(removeDeveloperGame);
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [kind, setKind] = useState<"arcade" | "cloud">("cloud"); const [busy, setBusy] = useState(false);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["developer-games"] }), client.invalidateQueries({ queryKey: ["console-catalog"] })]); };
  async function submit() {
    setBusy(true);
    try { await add({ data: { name, url, kind } }); await refresh(); setName(""); setUrl(""); toast.success("Game added"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add game"); } finally { setBusy(false); }
  }
  return <section className="mt-6 space-y-4 text-foreground"><h2 className="text-lg font-semibold">Developer games</h2>
    <form className="grid gap-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label className="grid gap-2 text-sm">Game section<Select value={kind} onValueChange={v => setKind(v as "arcade" | "cloud")}><SelectTrigger aria-label="Game section"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="arcade">Arcade game</SelectItem><SelectItem value="cloud">Cloud game</SelectItem></SelectContent></Select></label>
      <label className="grid gap-2 text-sm">Game name<Input required maxLength={100} value={name} onChange={e => setName(e.target.value)}/></label>
      <label className="grid gap-2 text-sm">Game URL<Input required placeholder="https://game.example.com" value={url} onChange={e => setUrl(e.target.value)}/></label>
      <Button type="submit" disabled={busy || !name.trim() || !url.trim()} className="justify-self-start">{busy ? <Loader2 className="animate-spin"/> : <Plus/>}Add game</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">Couldn't load added games.</p>}
    <div className="divide-y divide-border">{games.map(g => <div key={g.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{g.name} <span className="text-xs text-muted-foreground">{g.kind}</span></p><p className="truncate text-xs text-muted-foreground">{g.url}</p></div><Button variant="ghost" size="icon" disabled={busy} title={`Remove ${g.name}`} aria-label={`Remove ${g.name}`} onClick={async () => { setBusy(true); try { await remove({ data: { id: g.id } }); await refresh(); } catch { toast.error("Couldn't remove game"); } finally { setBusy(false); } }}><Trash2/></Button></div>)}</div>
  </section>;
}