import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Gamepad2, Home, Settings, UserRound, Wifi, BatteryFull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "./AppIcon";
import { DESKTOP_APPS, DesktopClock } from "./DesktopSurface";
import { WallpaperEffects } from "./WallpaperEffects";
import { WallpaperMedia } from "./WallpaperMedia";
import { NowPlayingBar } from "@/components/music/NowPlayingBar";
import { RoomFollower } from "@/components/RoomFollower";
import { WebsiteFullscreenButton } from "@/components/FullscreenButton";
import { getAppearance, usePrefs } from "@/lib/astra/prefs";
import { useAuth } from "@/lib/auth";
import landscape from "@/assets/console-landscape.jpg";

export function SwitchShell({ children }: { children: ReactNode }) {
  const prefs = usePrefs(); const look = getAppearance(prefs); const { user, guest } = useAuth();
  return <div className="switch-shell flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    {look.customBg && look.artwork && <WallpaperMedia src={look.customBg} type={look.wallpaperType} poster={look.wallpaperPoster} playback={look.wallpaperPlayback} reduceMotion={look.reduceMotion} className="switch-wallpaper"/>}<WallpaperEffects/>
    <header className="switch-header"><Button asChild variant="ghost" className="switch-user"><Link to="/settings"><UserRound/><span>{guest ? "Guest" : String(user?.user_metadata?.["full_name"] ?? "Player")}</span></Link></Button><strong>BirchBlock <span>Switch</span></strong><div className="flex items-center gap-3"><DesktopClock compact/><Wifi className="size-4"/><BatteryFull className="size-5"/></div></header>
    <main className="relative min-h-0 flex-1 overflow-auto">{children}</main><NowPlayingBar/>
    <footer className="switch-footer"><nav aria-label="Switch navigation" className="flex flex-wrap justify-center gap-3">{DESKTOP_APPS.filter(a => ["/home", "/store", "/games", "/movies", "/music", "/settings"].includes(a.to)).map(a => <Button asChild key={a.to} size="icon" variant="secondary" className="switch-system-button"><Link to={a.to} title={a.label} aria-label={a.label}><AppIcon app={a.to.slice(1)}/></Link></Button>)}</nav><div className="switch-bottom"><Button asChild variant="ghost" size="sm"><Link to="/home"><Home/>HOME</Link></Button><Button asChild variant="ghost" size="sm"><Link to="/settings"><Settings/>Settings</Link></Button></div></footer><WebsiteFullscreenButton/><RoomFollower/>
  </div>;
}
export function SwitchHome() {
  const navigate = useNavigate(); const [selected, setSelected] = useState("/games");
  const apps = DESKTOP_APPS.filter(a => ["/games", "/movies", "/music", "/web", "/store"].includes(a.to));
  const current = apps.find(a => a.to === selected) ?? apps[0];
  return <div className="switch-home"><div className="switch-title"><Gamepad2/><h1>{current?.label ?? "Games"}</h1></div><div className="switch-tiles" aria-label="Switch apps">{apps.map(a => <Button variant="ghost" key={a.to} aria-label={`Open ${a.label}`} onFocus={() => setSelected(a.to)} onMouseEnter={() => setSelected(a.to)} onClick={() => void navigate({ to: a.to })} className="switch-tile" data-selected={selected === a.to}><span className="switch-tile-art" data-tone={a.tone}>{a.to === "/games" && <img src={landscape} alt=""/>}<AppIcon app={a.to.slice(1)}/><strong>{a.label}</strong></span></Button>)}</div><div className="switch-home-actions"><Button variant="secondary" onClick={() => { if (current) void navigate({ to: current.to }); }}><Gamepad2/>Open {current?.label}</Button></div></div>;
}