import { Suspense, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Rnd } from "react-rnd";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Apple, BatteryFull, ChevronRight, LayoutGrid, Maximize2, Moon, Music, Plus, Search, Settings, SlidersHorizontal, Sun, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth, signOutAll } from "@/lib/auth";
import { getAppearance, setAppearance, setPrefs, usePrefs } from "@/lib/astra/prefs";
import { desktopReducer, makeWindow, type DesktopApp, type DesktopWindow, type WindowTab } from "@/lib/windows/window-model";
import { DesktopAppContent, desktopAppInfo, useLauncherApps } from "@/components/windows/desktop-apps";
import { AppIcon } from "@/components/astra/AppIcon";
import { NowPlayingBar } from "@/components/music/NowPlayingBar";
import { RoomFollower } from "@/components/RoomFollower";
import { WallpaperEffects } from "@/components/astra/WallpaperEffects";
import { WallpaperMedia } from "@/components/astra/WallpaperMedia";
import { DesktopWidgets } from "@/components/astra/DesktopWidgets";
import { WebsiteFullscreenButton } from "@/components/FullscreenButton";
import { cn } from "@/lib/utils";
import macWallpaper from "@/assets/macos-wallpaper.jpg";
import ipadWallpaper from "@/assets/ipad-wallpaper.jpg";

type Variant = "macos" | "ipad";
type Panel = null | "spotlight" | "launchpad" | "control" | "switcher" | "add";
const DOCK: DesktopApp[] = ["store", "games", "web", "movies", "music", "chat", "social", "settings"];
let serial = 0;
const uid = () => `apple-${++serial}`;
const tabFor = (app: DesktopApp): WindowTab => ({ id: uid(), app, title: desktopAppInfo(app).title });
const titleOf = (w?: DesktopWindow) => w?.tabs.find(t => t.id === w.activeTab)?.title ?? "";

function Tile({ app, size = "dock" }: { app: DesktopApp; size?: "dock" | "home" }) {
  return <span className={cn("apple-icon", size === "home" && "apple-icon-home")} data-tone={desktopAppInfo(app).tone}><AppIcon app={app}/></span>;
}

/** macOS Tahoe and iPadOS 26 style shells sharing the desktop window model and app views. */
export function AppleDesktop({ variant, children }: { variant: Variant; children?: ReactNode }) {
  const mac = variant === "macos";
  const prefs = usePrefs(); const look = getAppearance(prefs, variant);
  const { user } = useAuth(); const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const [state, dispatch] = useReducer(desktopReducer, { windows: [], active: null });
  const [panel, setPanel] = useState<Panel>(null); const [addTo, setAddTo] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [now, setNow] = useState<Date | null>(null);
  const [area, setArea] = useState({ width: 1280, height: 800 });
  const workspace = useRef<HTMLDivElement>(null); const routeId = useRef<string | null>(null);
  const name = String(user?.user_metadata?.["full_name"] ?? user?.email?.split("@")[0] ?? "Player");
  const compact = area.width < 640;
  const defaultMode: DesktopWindow["mode"] = mac ? "normal" : "maximized";

  useEffect(() => {
    const node = workspace.current; if (!node) return;
    const observer = new ResizeObserver(([e]) => { if (e) setArea({ width: e.contentRect.width, height: e.contentRect.height }); });
    observer.observe(node); setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 15000);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (path === "/desktop" || path === "/home") return;
    const title = path.startsWith("/movies") ? "Movies & TV" : path.startsWith("/chat") ? "BirchBlock AI" : path.split("/")[1] ?? "App";
    const tabs = [{ id: "route-tab", app: "route" as const, title }];
    if (routeId.current) dispatch({ type: "patch", id: routeId.current, patch: { tabs, activeTab: "route-tab", minimized: false } });
    else { const id = uid(); routeId.current = id; dispatch({ type: "open", window: { ...makeWindow(id, tabs[0]!), mode: defaultMode } }); }
  }, [path, defaultMode]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanel(null); setAddTo(null); }
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") { e.preventDefault(); setQuery(""); setPanel(p => p === "spotlight" ? null : "spotlight"); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);

  const launcher = useLauncherApps();
  const open = (app: DesktopApp, intoWindow?: string, fresh = false) => {
    setPanel(null); setAddTo(null); setQuery("");
    if (intoWindow) { dispatch({ type: "tab", id: intoWindow, tab: tabFor(app) }); return; }
    const running = !fresh && state.windows.find(w => w.tabs.some(t => t.app === app));
    if (running) { const tab = running.tabs.find(t => t.app === app)!; dispatch({ type: "patch", id: running.id, patch: { activeTab: tab.id } }); dispatch({ type: "focus", id: running.id }); return; }
    dispatch({ type: "open", window: { ...makeWindow(uid(), tabFor(app), state.windows.length), mode: defaultMode } });
  };
  const close = (id: string) => { dispatch({ type: "close", id }); if (id === routeId.current) { routeId.current = null; void navigate({ to: "/desktop" }); } };
  const patch = (id: string, value: Partial<DesktopWindow>) => dispatch({ type: "patch", id, patch: value });
  const active = state.windows.find(w => w.id === state.active && !w.minimized);
  const visible = state.windows.filter(w => !w.minimized);
  const fullApp = visible.some(w => w.mode === "maximized" || compact);
  const results = launcher.filter(a => a.id !== "home" && a.title.toLowerCase().includes(query.toLowerCase()));
  const toggleMode = (w: DesktopWindow) => patch(w.id, { mode: w.mode === "maximized" ? "normal" : "maximized" });
  const home = <div className="h-full overflow-auto p-8"><p className="text-xs text-muted-foreground">BIRCHBLOCK</p><h1 className="mt-2 text-3xl font-semibold">Welcome, {name}</h1><div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5">{launcher.filter(a => a.id !== "home").map(a => <Button key={a.id} variant="ghost" className="apple-grid-app" onClick={() => open(a.id)}><Tile app={a.id} size="home"/><span>{a.title}</span></Button>)}</div></div>;
  const clock = now ? `${now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}  ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "";

  const menu = (label: ReactNode, items: { label: string; run: () => void; disabled?: boolean }[], bold = false, aria?: string) => <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={aria} className={cn("apple-menu-button", bold && "font-semibold")}>{label}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="apple-menu min-w-52">{items.map((i, n) => i.label === "-" ? <DropdownMenuSeparator key={`sep-${n}`}/> : <DropdownMenuItem key={`${n}-${i.label}`} disabled={Boolean(i.disabled)} onSelect={i.run}>{i.label}</DropdownMenuItem>)}</DropdownMenuContent>
  </DropdownMenu>;

  return <div data-apple={variant} data-full-window={fullApp} className="apple-desktop fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
    {look.artwork && <WallpaperMedia src={look.customBg || (mac ? macWallpaper : ipadWallpaper)} type={look.wallpaperType} poster={look.wallpaperPoster} playback={look.wallpaperPlayback} reduceMotion={look.reduceMotion} className="absolute inset-0 size-full object-cover"/>}
    <WallpaperEffects/>

    {mac ? <header className="apple-menubar relative z-[320] flex shrink-0 items-center gap-0.5 px-2">
      {menu(<Apple className="size-4"/>, [
        { label: "About BirchBlock", run: () => open("home") },
        { label: "-", run: () => {} },
        { label: "System Settings…", run: () => open("settings") },
        { label: "Birch Store…", run: () => open("store") },
        { label: "-", run: () => {} },
        { label: `Log Out ${name}…`, run: () => void signOutAll() },
      ], false, "System menu")}
      {menu(active ? titleOf(active) : "Finder", [
        { label: "Settings…", run: () => open("settings") },
        { label: "Hide", run: () => active && dispatch({ type: "minimize", id: active.id }), disabled: !active },
        { label: "Quit", run: () => active && close(active.id), disabled: !active },
      ], true)}
      <span className="hidden sm:contents">
        {menu("File", [
          { label: "New Window", run: () => open(active?.tabs.find(t => t.id === active.activeTab)?.app === "route" || !active ? "web" : active.tabs.find(t => t.id === active.activeTab)!.app, undefined, true) },
          { label: "New Tab", run: () => { if (active) { setAddTo(active.id); setPanel("add"); } }, disabled: !active },
          { label: "Close Window", run: () => active && close(active.id), disabled: !active },
        ])}
        {menu("View", [
          { label: active?.mode === "maximized" ? "Exit Full Screen" : "Enter Full Screen", run: () => active && toggleMode(active), disabled: !active },
          { label: "Tile Window to Left", run: () => active && patch(active.id, { mode: "left" }), disabled: !active },
          { label: "Tile Window to Right", run: () => active && patch(active.id, { mode: "right" }), disabled: !active },
        ])}
        {menu("Window", [
          { label: "Minimize", run: () => active && dispatch({ type: "minimize", id: active.id }), disabled: !active },
          { label: "Zoom", run: () => active && toggleMode(active), disabled: !active },
          { label: "Show Desktop", run: () => dispatch({ type: "show-desktop" }) },
          ...(state.windows.length ? [{ label: "-", run: () => {} }] : []),
          ...state.windows.map(w => ({ label: titleOf(w) + (w.minimized ? " (hidden)" : ""), run: () => dispatch({ type: "focus", id: w.id }) })),
        ])}
        {menu("Help", [{ label: "Search apps", run: () => { setQuery(""); setPanel("spotlight"); } }, { label: "Launchpad", run: () => setPanel("launchpad") }])}
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="apple-menu-icon" aria-label="Spotlight search" title="Spotlight (Ctrl/⌘ + Space)" onClick={() => { setQuery(""); setPanel(panel === "spotlight" ? null : "spotlight"); }}><Search/></Button>
        <Button variant="ghost" size="icon" className="apple-menu-icon" aria-label="Control Center" title="Control Center" onClick={() => setPanel(panel === "control" ? null : "control")}><SlidersHorizontal/></Button>
        {look.showClock && <span className="px-2 text-[13px] tabular-nums">{clock}</span>}
      </div>
    </header> : <header className="ipad-status relative z-[320] flex h-7 shrink-0 items-center px-5 text-[13px] font-semibold tabular-nums">
      {look.showClock && <span>{now?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}<span className="ml-2 font-normal opacity-80">{now?.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span></span>}
      <Button variant="ghost" size="sm" className="ml-auto h-6 gap-1.5 px-2" aria-label="Control Center" onClick={() => setPanel(panel === "control" ? null : "control")}><Wifi className="size-4"/><BatteryFull className="size-4"/></Button>
    </header>}

    <div ref={workspace} className="relative min-h-0 flex-1" onPointerDown={e => { if (e.target === e.currentTarget) setPanel(null); }}>
      {!mac && <div className="ipad-home" aria-label="Home screen" onPointerDown={e => { if (e.target === e.currentTarget) setPanel(null); }}>
        <div className="ipad-home-grid">{launcher.filter(a => a.id !== "home").map(a => <Button key={a.id} variant="ghost" className="apple-grid-app" onClick={() => open(a.id)} aria-label={`Open ${a.title}`}><Tile app={a.id} size="home"/>{look.iconLabels !== false && <span>{a.title}</span>}</Button>)}</div>
      </div>}
      <DesktopWidgets onMusic={() => open("music")}/>

      {state.windows.map((w, i) => {
        const maximized = compact || w.mode === "maximized"; const snapped = w.mode === "left" || w.mode === "right";
        const width = maximized ? area.width : snapped ? area.width / 2 : Math.min(w.width, area.width - 24);
        const height = maximized || snapped ? area.height : Math.min(w.height, area.height - 24);
        const position = { x: maximized || w.mode === "left" ? 0 : w.mode === "right" ? area.width / 2 : Math.min(w.x, Math.max(0, area.width - width)), y: maximized || snapped ? 0 : Math.min(w.y, Math.max(0, area.height - height)) };
        const isActive = state.active === w.id;
        return <Rnd key={w.id} bounds="parent" minWidth={Math.min(360, area.width)} minHeight={240} size={{ width, height }} position={position} disableDragging={maximized || snapped} enableResizing={!maximized && !snapped} dragHandleClassName="apple-drag" cancel="button,input" style={{ zIndex: isActive ? 100 : i + 1, display: w.minimized ? "none" : undefined }} onMouseDown={() => dispatch({ type: "focus", id: w.id })} onTouchStart={() => dispatch({ type: "focus", id: w.id })} onDragStop={(_e, d) => patch(w.id, { x: d.x, y: d.y })} onResizeStop={(_e, _dir, ref, _delta, pos) => patch(w.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })}>
          <section aria-label={`${titleOf(w)} window`} data-maximized={maximized} className={cn("apple-window flex size-full flex-col overflow-hidden", isActive && "is-active")}>
            <header className="apple-drag relative flex h-10 shrink-0 items-center gap-3 px-3" onDoubleClick={() => toggleMode(w)}>
              <div className="apple-traffic flex items-center gap-2">
                <button type="button" data-light="close" aria-label="Close window" title="Close" onClick={() => close(w.id)}><X/></button>
                <button type="button" data-light="minimize" aria-label="Minimize" title="Minimize" onClick={() => dispatch({ type: "minimize", id: w.id })}><span className="block h-px w-1.5 bg-current"/></button>
                <button type="button" data-light="zoom" aria-label={maximized ? "Exit full screen" : "Full screen"} title={maximized ? "Exit full screen" : "Full screen"} onClick={() => toggleMode(w)}><Maximize2/></button>
              </div>
              <span className="pointer-events-none absolute inset-x-24 truncate text-center text-[13px] font-semibold">{titleOf(w)}</span>
              <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Add app tab" title="New tab" onClick={() => { setAddTo(w.id); setPanel("add"); }}><Plus/></Button>
            </header>
            {w.tabs.length > 1 && <div className="flex h-8 shrink-0 items-center gap-1 overflow-x-auto px-2 pb-1">{w.tabs.map(t => <div key={t.id} className={cn("apple-tab flex min-w-24 max-w-48 flex-1 items-center", w.activeTab === t.id && "is-active")}><Button variant="ghost" size="sm" className="h-6 min-w-0 flex-1 justify-center truncate text-xs" onClick={() => patch(w.id, { activeTab: t.id })}>{t.title}</Button><Button variant="ghost" size="icon" className="size-5" aria-label={`Close ${t.title} tab`} onClick={() => dispatch({ type: "close-tab", id: w.id, tabId: t.id })}><X className="size-3"/></Button></div>)}</div>}
            {w.tabs.map(t => <div key={t.id} data-app={t.app === "route" ? path.split("/")[1] : t.app} className={cn("windows-app-content native-app min-h-0 flex-1 overflow-hidden bg-background", t.id !== w.activeTab && "hidden")}><Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Opening {t.title}…</div>}><DesktopAppContent tab={t} onOpen={app => open(app)} home={home}>{children}</DesktopAppContent></Suspense></div>)}
          </section>
        </Rnd>;
      })}

      {(panel === "spotlight" || panel === "add") && <section aria-label={panel === "add" ? "Add a tab" : "Spotlight"} className="apple-glass apple-spotlight absolute left-1/2 top-[14%] z-[400] w-[min(640px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-2">
        <div className="relative"><Search className="absolute left-4 top-3.5 size-5 text-muted-foreground"/><Input autoFocus aria-label="Search apps" placeholder={panel === "add" ? "Open in a new tab…" : "Spotlight Search"} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && results[0]) open(results[0].id, panel === "add" ? addTo ?? undefined : undefined); }} className="h-12 rounded-2xl border-0 bg-transparent pl-12 text-lg shadow-none focus-visible:ring-0"/></div>
        <div className="mt-1 max-h-80 overflow-auto">{results.map(a => <Button key={a.id} variant="ghost" className="h-11 w-full justify-start gap-3 rounded-xl" onClick={() => open(a.id, panel === "add" ? addTo ?? undefined : undefined)}><span className="size-7"><Tile app={a.id}/></span>{a.title}<ChevronRight className="ml-auto opacity-50"/></Button>)}{!results.length && <p className="p-4 text-sm text-muted-foreground">No apps match “{query}”.</p>}</div>
      </section>}

      {panel === "launchpad" && <section aria-label="Launchpad" className="apple-launchpad absolute inset-0 z-[390] flex flex-col items-center overflow-auto p-8" onPointerDown={e => { if (e.target === e.currentTarget) setPanel(null); }}>
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input autoFocus aria-label="Search apps" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} className="h-9 rounded-full bg-background/40 pl-9"/></div>
        <div className="mt-10 grid w-full max-w-4xl grid-cols-3 gap-6 sm:grid-cols-5 md:grid-cols-6">{results.map(a => <Button key={a.id} variant="ghost" className="apple-grid-app" onClick={() => open(a.id)}><Tile app={a.id} size="home"/><span>{a.title}</span></Button>)}</div>
      </section>}

      {panel === "switcher" && <section aria-label="App switcher" className="apple-launchpad absolute inset-0 z-[390] flex items-center gap-5 overflow-x-auto p-8" onPointerDown={e => { if (e.target === e.currentTarget) setPanel(null); }}>
        {state.windows.map(w => <div key={w.id} className="apple-glass flex h-64 w-56 shrink-0 flex-col rounded-3xl p-4"><div className="flex items-center gap-2"><span className="size-7"><Tile app={w.tabs.find(t => t.id === w.activeTab)?.app ?? "home"}/></span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{titleOf(w)}</span><Button variant="ghost" size="icon" className="size-7" aria-label={`Close ${titleOf(w)}`} onClick={() => close(w.id)}><X/></Button></div><Button variant="ghost" className="mt-3 flex-1 rounded-2xl bg-background/60" onClick={() => { dispatch({ type: "focus", id: w.id }); setPanel(null); }}>Open</Button></div>)}
        {!state.windows.length && <p className="mx-auto text-sm">No open apps</p>}
      </section>}

      {panel === "control" && <section aria-label="Control Center" className="apple-glass absolute right-3 top-2 z-[400] w-80 rounded-3xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" className="apple-cc-tile" aria-pressed={look.mode === "dark"} onClick={() => setAppearance(variant, { mode: look.mode === "dark" ? "light" : "dark" })}>{look.mode === "dark" ? <Moon/> : <Sun/>}<span>{look.mode === "dark" ? "Dark" : "Light"}</span></Button>
          <Button variant="ghost" className="apple-cc-tile" aria-pressed={!prefs.musicBarHidden} onClick={() => setPrefs({ musicBarHidden: !prefs.musicBarHidden })}><Music/><span>Music bar</span></Button>
          <Button variant="ghost" className="apple-cc-tile" onClick={() => void document.documentElement.requestFullscreen().catch(() => {})}><Maximize2/><span>Full screen</span></Button>
          <Button variant="ghost" className="apple-cc-tile" onClick={() => setPanel(mac ? "launchpad" : "switcher")}><LayoutGrid/><span>{mac ? "Launchpad" : "App switcher"}</span></Button>
        </div>
        <div className="apple-cc-slider mt-3"><p>Display</p><div className="flex items-center gap-3"><Sun className="size-4 opacity-70"/><Slider aria-label="Display brightness" min={50} max={130} step={5} value={[look.brightness ?? 100]} onValueChange={([v]) => setAppearance(variant, { brightness: v ?? 100 })}/></div></div>
        <Button variant="ghost" className="mt-3 w-full justify-start" onClick={() => open("settings")}><Settings/>All settings</Button>
      </section>}
    </div>

    <div className="relative z-[310]"><NowPlayingBar/></div>
    {(mac || !fullApp) && <footer className="apple-dock-row relative z-[310] flex shrink-0 justify-center pb-2 pt-1">
      <nav className="apple-dock apple-glass flex items-end gap-1 overflow-x-auto" aria-label="Dock">
        {mac && <Button variant="ghost" className="apple-dock-item" aria-label="Launchpad" title="Launchpad" onClick={() => { setQuery(""); setPanel(panel === "launchpad" ? null : "launchpad"); }}><span className="apple-icon" data-tone="neutral"><LayoutGrid/></span></Button>}
        {DOCK.map(app => { const running = state.windows.some(w => w.tabs.some(t => t.app === app)); return <Button key={app} variant="ghost" className="apple-dock-item" aria-label={`Open ${desktopAppInfo(app).title}`} title={desktopAppInfo(app).title} onClick={() => open(app)}><Tile app={app}/>{running && <i className="apple-dock-dot"/>}</Button>; })}
        {!mac && state.windows.length > 0 && <><span className="apple-dock-divider"/><Button variant="ghost" className="apple-dock-item" aria-label="App switcher" title="App switcher" onClick={() => setPanel("switcher")}><span className="apple-icon" data-tone="neutral"><LayoutGrid/></span></Button></>}
        {mac && <><span className="apple-dock-divider"/><Button variant="ghost" className="apple-dock-item" aria-label="System menu" title={name} onClick={() => open("settings")}><span className="apple-icon" data-tone="neutral"><Apple/></span></Button></>}
      </nav>
    </footer>}
    {!mac && fullApp && <button type="button" className="ipad-home-indicator" aria-label="Go to Home Screen" title="Home (double-tap for app switcher)" onClick={() => { dispatch({ type: "show-desktop" }); setPanel(null); }} onDoubleClick={() => setPanel("switcher")}/>}
    <WebsiteFullscreenButton/><RoomFollower/>
  </div>;
}
