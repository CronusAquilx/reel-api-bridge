import { useEffect, useRef, useState } from "react";
import { Home, Library, ShoppingBag, Film, Settings, User, X, Download, Heart, Gamepad2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsoleCtx } from "@/lib/console/ctx";
import { useConsoleInput } from "@/lib/console/nav";
import { Avatar } from "../shared";

export function XboxGuide({ close }: { close: () => void }) {
  const { go, name, initial, lib, clock, catalog } = useConsoleCtx();
  const [tab, setTab] = useState<"home" | "downloads" | "profile">("home");
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { const previous = document.activeElement; panel.current?.querySelector<HTMLButtonElement>("button")?.focus(); return () => { if (previous instanceof HTMLElement) previous.focus(); }; }, []);
  useConsoleInput(a => {
    if (a === "back" || a === "menu") close();
    if (a === "prev" || a === "next") setTab(tab === "home" ? "downloads" : tab === "downloads" ? "profile" : "home");
    if (a === "up" || a === "down") {
      const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[Math.max(0, Math.min(buttons.length - 1, index + (a === "up" ? -1 : 1)))]?.focus();
    }
  });
  const jump = (path: string) => { close(); void go(path); };
  const links = [{ label: "Home", icon: Home, path: "/console" }, { label: "My games & apps", icon: Library, path: "/console/library" }, { label: "Game Store", icon: ShoppingBag, path: "/console/store" }, { label: "Friends & parties", icon: Users, path: "/console/social" }, { label: "Entertainment", icon: Film, path: "/console/media" }, { label: "Settings", icon: Settings, path: "/console/settings" }];
  return <div className="xbox-guide-overlay fixed inset-0 z-50 bg-console-ink/65" onClick={close}>
    <aside ref={panel} role="dialog" aria-modal="true" aria-label="Xbox guide" className="xbox-guide flex h-full w-full max-w-sm flex-col bg-console-panel p-6" onClick={e => e.stopPropagation()}>
      <div className="mb-6 flex items-center gap-4"><Gamepad2 className="size-7 text-xbox-accent"/><h2 className="text-xl">Guide</h2><Button variant="console" size="console" aria-label="Close guide" title="Close guide" onClick={close} className="ml-auto size-10"><X/></Button></div>
      <nav className="mb-7 flex gap-4 border-b border-console-foreground/15 pb-4">{([{ id: "home", icon: Home, label: "Home guide" }, { id: "downloads", icon: Download, label: "Download queue" }, { id: "profile", icon: User, label: "Profile guide" }] as const).map(t => <Button variant="console" size="console" key={t.id} aria-label={t.label} title={t.label} aria-pressed={tab === t.id} className={`xbox-control size-11 ${tab === t.id ? "bg-xbox-accent text-console-ink" : "bg-console-foreground/10"}`} onClick={() => setTab(t.id)}><t.icon/></Button>)}</nav>
      {tab === "home" && <div className="flex flex-col gap-2">{links.map(l => <Button key={l.path} variant="console" size="console" className="xbox-control min-h-14 justify-start gap-4 px-4 text-base" onClick={() => jump(l.path)}><l.icon/>{l.label}</Button>)}</div>}
      {tab === "downloads" && <><h3 className="mb-5 text-lg">Download queue</h3>{Object.entries(lib.progress).length ? Object.entries(lib.progress).map(([id, progress]) => <div key={id} className="border-b border-console-foreground/15 py-4"><p>{catalog.games.find(g => g.id === id)?.title ?? "Game"}</p><progress value={progress} max={100} className="console-progress mt-3 w-full"/><span className="text-sm text-console-foreground/60">{Math.floor(progress)}%</span></div>) : <p className="text-console-foreground/60">No downloads in progress.</p>}<Button variant="console" size="console" className="xbox-control mt-6 justify-start gap-3 p-4" onClick={() => jump("/console/store")}><ShoppingBag/>Browse store</Button></>}
      {tab === "profile" && <><div className="flex items-center gap-4"><Avatar initial={initial} className="size-14"/><span className="text-lg">{name}</span></div><Button variant="console" size="console" className="xbox-control mt-6 justify-start gap-3 p-4" onClick={() => jump("/console/profile")}><User/>My profile</Button><Button variant="console" size="console" className="xbox-control justify-start gap-3 p-4" onClick={() => jump("/console/library")}><Heart/>{lib.wishlist.length} favorites</Button></>}
      <div className="mt-auto flex justify-between border-t border-console-foreground/15 pt-5 text-sm text-console-foreground/60"><span>BirchBlock · Series X</span><span>{clock}</span></div>
    </aside>
  </div>;
}