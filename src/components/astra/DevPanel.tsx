import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Delete } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { checkDevPin, devSignIn } from "@/lib/astra/dev-access.functions";

const ACCOUNTS = [{ id: "qais", label: "Qais" }, { id: "chance", label: "Chance" }] as const;

/** Hidden developer panel: PIN pad first, then the developer account picker. */
export function DevPanel({ open, onOpenChange, onSignedIn }: { open: boolean; onOpenChange: (o: boolean) => void; onSignedIn: () => Promise<void> }) {
  const [pin, setPin] = useState(""); const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const check = useServerFn(checkDevPin); const signIn = useServerFn(devSignIn);
  useEffect(() => { if (!open) { setPin(""); setUnlocked(false); setError(""); } }, [open]);

  async function press(d: string) {
    if (busy || pin.length >= 4) return;
    const next = pin + d; setPin(next); setError("");
    if (next.length === 4) {
      setBusy(true);
      const r = await check({ data: { code: next } }).catch(() => ({ ok: false }));
      setBusy(false);
      if (r.ok) setUnlocked(true); else { setError("Wrong code"); setPin(""); }
    }
  }
  useEffect(() => {
    if (!open || unlocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) void press(e.key);
      else if (e.key === "Backspace") setPin(p => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  async function choose(account: "qais" | "chance") {
    setBusy(true); setError("");
    try {
      const r = await signIn({ data: { account, code: pin } });
      if (!r.ok) throw new Error(r.error);
      const v = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" }); if (v.error) throw v.error;
      onOpenChange(false); await onSignedIn();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't sign in"); } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xs">
      <DialogHeader><DialogTitle>{unlocked ? "Choose account" : "Enter code"}</DialogTitle><DialogDescription>{unlocked ? "Pick an account to continue." : "Enter the 4-digit code."}</DialogDescription></DialogHeader>
      {unlocked ? <div className="grid gap-3">{ACCOUNTS.map(a => <Button key={a.id} disabled={busy} onClick={() => void choose(a.id)}>{a.label}</Button>)}</div> : <>
        <div className="flex justify-center gap-3 py-2" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map(i => <span key={i} className={`size-3 rounded-full border border-foreground ${i < pin.length ? "bg-foreground" : ""}`} />)}</div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => <Button key={d} variant="outline" className="h-14 text-xl" disabled={busy} onClick={() => void press(d)}>{d}</Button>)}
          <span />
          <Button variant="outline" className="h-14 text-xl" disabled={busy} onClick={() => void press("0")}>0</Button>
          <Button variant="ghost" className="h-14" aria-label="Delete digit" disabled={busy} onClick={() => setPin(p => p.slice(0, -1))}><Delete /></Button>
        </div>
      </>}
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}
