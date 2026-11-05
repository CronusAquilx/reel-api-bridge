import { useState } from "react";
import { Music, Film, Bot, Globe, AudioLines, Brain, Gamepad2, Youtube, Tv, Clapperboard, MonitorPlay, ArrowLeft, Heart, Trash2, Play, Download, X } from "lucide-react";
import { artStyle, type ConsoleGame } from "@/lib/console/catalog";
import { actOn, toggleWishlist, uninstallGame, type Lib } from "@/lib/console/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { consoleArtwork, fallbackArtwork } from "@/lib/console/artwork";
import { SocialShare } from "@/components/social/SocialAccess";
export const APP_ICONS = { "app-music": Music, "app-movies": Film, "app-ai": Bot, "app-web": Globe, "app-voice": AudioLines, "app-memory": Brain, "app-youtube": Youtube, "app-netflix": Clapperboard, "app-hulu": Tv, "app-paramount": MonitorPlay };
export function GameArt({ game, className, title = true, titleClass }: { game: ConsoleGame; className?: string; title?: boolean; titleClass?: string }) {
  const Icon = APP_ICONS[game.id as keyof typeof APP_ICONS] ?? Gamepad2;
  const [failed, setFailed] = useState(false);
  const artwork = failed ? fallbackArtwork(game.title, game.kind) : consoleArtwork(game);
  return <div className={cn("console-art relative flex h-full w-full flex-col items-center justify-center overflow-hidden", className)} style={artStyle(game.hue)}>{artwork ? <><img src={artwork} alt="" width={1024} height={1024} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="absolute inset-0 h-full w-full object-cover"/>{title && <div className="absolute inset-x-0 bottom-0 h-28 bg-console-ink/85"/>}</> : <Icon className="size-9 opacity-85 md:size-12"/>}{title && <span className={cn(artwork ? "absolute inset-x-0 bottom-10" : "mt-4", "max-w-full px-3 text-center text-base font-semibold leading-tight", titleClass)}>{game.title}</span>}</div>;
}
export function statusOf(g: ConsoleGame, lib: Lib) {
  if (g.kind === "app" && !g.installable) return "Ready to open";
  if (lib.installed.includes(g.id)) return "Installed";
  if (g.id in lib.progress) return `Installing ${Math.floor(lib.progress[g.id] ?? 0)}%`;
  return g.kind === "cloud" || g.installable ? "Get" : "Free";
}
export function Avatar({ initial, className }: { initial: string; className?: string }) { return <span className={cn("console-avatar flex items-center justify-center rounded-full font-semibold", className)}>{initial}</span>; }
export function BackButton({ onClick }: { onClick: () => void }) { return <Button variant="console" size="console" aria-label="Console home" title="Console home" onClick={onClick} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-console-foreground/10"><ArrowLeft/></Button>; }
export function GameDetails({ game, lib, close }: { game: ConsoleGame; lib: Lib; close: () => void }) {
  const navigate = useNavigate();
  const open = () => actOn(game, lib, path => { close(); void navigate({ to: path }); });
  const ready = game.kind === "app" && !game.installable; const installed = lib.installed.includes(game.id); const progress = lib.progress[game.id];
  return <div className="console-overlay fixed inset-0 z-40 flex items-center justify-center bg-console-ink/75 p-5" onClick={close}><section role="dialog" aria-modal="true" aria-label={game.title} className="relative w-full max-w-lg rounded-lg bg-console-panel p-6" onClick={e=>e.stopPropagation()}><Button variant="console" size="console" aria-label="Close game details" className="absolute right-4 top-4 z-10 size-9 rounded-full bg-console-ink/50" onClick={close}><X/></Button><div className="h-44 overflow-hidden rounded-lg"><GameArt game={game}/></div><h2 className="mt-5 text-2xl">{game.title}</h2><p className="mt-2 text-sm text-console-foreground/60">{game.kind === "cloud" ? "Cloud / browser provider · access requirements vary by provider" : game.tagline}</p>{progress !== undefined && <progress className="console-progress mt-5 w-full" value={progress} max={100} aria-label="Installation progress"/>}<div className="mt-6 flex flex-wrap gap-3"><Button variant="console" size="console" disabled={progress !== undefined} onClick={open} className="rounded-full bg-console-foreground px-7 py-3 text-console-ink">{installed || ready ? <Play/> : <Download/>}{ready ? "Open" : installed ? (game.kind === "app" ? "Open" : "Play") : progress !== undefined ? `Installing ${Math.floor(progress)}%` : "Install"}</Button><Button variant="console" size="console" aria-label="Wishlist" title="Wishlist" onClick={()=>toggleWishlist(game.id)} className="size-12 rounded-full bg-console-foreground/10"><Heart className={lib.wishlist.includes(game.id)?"fill-console-foreground":""}/></Button><SocialShare title={game.title} link={`/console/store?game=${encodeURIComponent(game.id)}`} />{installed && !ready && <Button variant="console" size="console" onClick={()=>{uninstallGame(game.id);close();}} className="rounded-full bg-console-foreground/10 px-5"><Trash2/>Uninstall</Button>}</div></section></div>;
}
