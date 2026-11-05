import { lazy, type ReactNode } from "react";
import { Bot, Brain, Film, Gamepad2, Globe, Home, LayoutGrid, Mic, Music, Settings, Users } from "lucide-react";
import { AccountOnly } from "@/components/astra/SignInRequired";
import type { DesktopApp, WindowTab } from "@/lib/windows/window-model";
import { StoreView } from "./views/StoreView";
import { TOOL_APPS, toolFromApp, useInstalledTools } from "@/lib/windows/tool-apps";
const ToolAppView = lazy(() => import("./views/ToolAppView").then(m => ({ default: m.ToolAppView })));

const MusicView = lazy(() => import("./views/MusicView").then(m => ({ default: m.MusicView })));
const MoviesView = lazy(() => import("./views/MoviesView").then(m => ({ default: m.MoviesView })));
const GamesView = lazy(() => import("./views/GamesView").then(m => ({ default: m.GamesView })));
const WebView = lazy(() => import("./views/WebView").then(m => ({ default: m.WebView })));
const ChatView = lazy(() => import("./views/ChatView").then(m => ({ default: m.ChatView })));
const MemoryView = lazy(() => import("./views/MemoryView").then(m => ({ default: m.MemoryView })));
const VoiceView = lazy(() => import("./views/VoiceView").then(m => ({ default: m.VoiceView })));
const SettingsView = lazy(() => import("./views/SettingsView").then(m => ({ default: m.SettingsView })));
const SocialHub = lazy(() => import("@/components/social/SocialHub").then(m => ({ default: m.SocialHub })));

/** Apps shared by every desktop-style layout (Windows, macOS, iPad). */
export const DESKTOP_APPS = [
  { id: "home", title: "Home", icon: Home, tone: "cyan" },
  { id: "store", title: "Birch Store", icon: LayoutGrid, tone: "cyan" },
  { id: "games", title: "Games", icon: Gamepad2, tone: "green" },
  { id: "web", title: "Browser", icon: Globe, tone: "cyan" },
  { id: "movies", title: "Movies & TV", icon: Film, tone: "coral" },
  { id: "music", title: "Music", icon: Music, tone: "green" },
  { id: "chat", title: "BirchBlock AI", icon: Bot, tone: "gold" },
  { id: "social", title: "Friends & parties", icon: Users, tone: "green" },
  { id: "memory", title: "Memory", icon: Brain, tone: "gold" },
  { id: "voice", title: "Voice", icon: Mic, tone: "cyan" },
  { id: "settings", title: "Settings", icon: Settings, tone: "neutral" },
] as const;
export type DesktopAppInfo = { id: DesktopApp; title: string; tone: string };
export const desktopAppInfo = (id: DesktopApp): DesktopAppInfo => { const t = toolFromApp(id); if (t) return { id, title: t.title, tone: t.tone }; return DESKTOP_APPS.find(a => a.id === id) ?? DESKTOP_APPS[0]; };
/** Built-in apps followed by the store apps this person has downloaded. */
export function useLauncherApps(): DesktopAppInfo[] {
  const installed = useInstalledTools();
  return [...DESKTOP_APPS, ...TOOL_APPS.filter(t => installed.includes(t.id)).map(t => ({ id: `tool:${t.id}` as DesktopApp, title: t.title, tone: t.tone }))];
}

/** Renders one app tab; `home` is the layout's own home screen, `children` the routed page. */
export function DesktopAppContent({ tab, onOpen, home, children }: { tab: WindowTab; onOpen: (app: DesktopApp) => void; home: ReactNode; children?: ReactNode }) {
  switch (tab.app) {
    case "home": return <>{home}</>;
    case "store": return <StoreView onOpen={app => onOpen(app)}/>;
    case "music": return <MusicView/>;
    case "movies": return <MoviesView/>;
    case "games": return <GamesView initialGame={tab.game}/>;
    case "web": return <WebView/>;
    case "chat": return <AccountOnly><ChatView/></AccountOnly>;
    case "memory": return <AccountOnly><MemoryView/></AccountOnly>;
    case "voice": return <AccountOnly><VoiceView/></AccountOnly>;
    case "settings": return <SettingsView/>;
    case "social": return <div className="h-full overflow-auto p-4"><SocialHub/></div>;
    case "route": return <>{children}</>;
    default: return tab.app.startsWith("tool:") ? <ToolAppView id={tab.app.slice(5)}/> : null;
  }
}
