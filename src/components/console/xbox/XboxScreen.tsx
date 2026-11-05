import { useEffect, useMemo, useRef, useState } from "react";
import { Gamepad2, Library, ShoppingBag, Search, Settings, Film, Home, Download, Heart, Play, Paintbrush, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APPS, gameById, type ConsoleGame } from "@/lib/console/catalog";
import { consoleArtwork } from "@/lib/console/artwork";
import { useConsoleCtx } from "@/lib/console/ctx";
import { moveGrid, moveShelf, useCols, useConsoleInput } from "@/lib/console/nav";
import { actOn, playGame } from "@/lib/console/store";
import { cn } from "@/lib/utils";
import { ConsoleShell } from "../ConsoleShell";
import { Avatar, GameArt, GameDetails, statusOf } from "../shared";
import { XboxGuide } from "./XboxGuide";
import type { ConsoleScreenName } from "../ConsoleScreen";

type XboxScreenProps = { screen: ConsoleScreenName };
export function XboxScreen({ screen }: XboxScreenProps) {
  const ctx = useConsoleCtx();
  const { go, lib, catalog, name, initial, clock, p } = ctx;
  const [guide, setGuide] = useState(false);
  const [details, setDetails] = useState<ConsoleGame | null>(null);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const refs = useRef<(HTMLButtonElement | null)[][]>([]);
  const search = useRef<HTMLInputElement>(null);
  const cols = useCols(5, 3, 2);
  const isHome = screen === "home" || screen === "media";
  const media = screen === "media";
  const store = screen === "store";
  const apps = screen === "apps";
  const installed = useMemo(() => lib.installed.map(id => gameById(id, catalog.games)).filter((g): g is ConsoleGame => Boolean(g)), [lib.installed, catalog.games]);
  const recent = gameById(lib.lastPlayed, catalog.games);
  const games = catalog.games.filter(g => g.kind !== "app");
  const homeItems = useMemo(() => {
    if (media) return [...APPS.filter(g => !g.installable || lib.installed.includes(g.id))];
    // Home only shows titles the user owns (downloaded from the store), most recent first.
    const owned = installed.filter(g => g.kind !== "app");
    const ordered = [...(recent && owned.some(g => g.id === recent.id) ? [recent] : []), ...owned];
    return ordered.filter((g, i, all) => all.findIndex(x => x.id === g.id) === i).slice(0, 9);
  }, [media, lib.installed, lib.lastPlayed, catalog.games]);
  const favorites = catalog.games.filter(g => lib.wishlist.includes(g.id));
  const ownedShelf = installed.filter(g => !homeItems.some(h => h.id === g.id) || g.kind === "app").slice(0, 10);
  const visible = useMemo(() => {
    const source = store ? catalog.games : apps ? APPS.filter(g => !g.installable || lib.installed.includes(g.id)) : filter === "wishlist" ? favorites : filter === "queue" ? catalog.games.filter(g => g.id in lib.progress) : installed;
    const filtered = source.filter(g => (!apps || g.kind === "app") && (filter !== "games" || g.kind !== "app") && (filter !== "apps" || g.kind === "app") && (filter !== "cloud" || g.kind === "cloud") && (filter !== "arcade" || g.kind === "arcade") && g.title.toLowerCase().includes(query.toLowerCase()));
    return sort === "az" ? [...filtered].sort((a, b) => a.title.localeCompare(b.title)) : sort === "za" ? [...filtered].sort((a, b) => b.title.localeCompare(a.title)) : filtered;
  }, [store, apps, filter, query, sort, catalog.games, lib]);
  const current = homeItems[Math.min(pos.c, homeItems.length - 1)];
  const focusAt = (r: number, c: number) => { setPos({ r, c }); refs.current[r]?.[c]?.focus({ preventScroll: true }); refs.current[r]?.[c]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: p.reduceMotion ? "auto" : "smooth" }); };
  useEffect(() => { setPos({ r: 0, c: 0 }); setFilter("all"); setQuery(""); }, [screen]);
  useConsoleInput(a => {
    if (a === "menu") { setGuide(true); return; }
    if (a === "back") { if (details) setDetails(null); else void go("/console"); return; }
    if (details) return;
    if (a === "prev" || a === "next") { void go(media ? "/console" : "/console/media"); return; }
    if (a === "options") { if (isHome && current) setDetails(current); else setGuide(true); return; }
    if (a === "select") { refs.current[pos.r]?.[pos.c]?.click(); return; }
    if (isHome) { const next = moveShelf(pos, [homeItems.length, 4, media ? APPS.filter(g => g.installable).length : ownedShelf.length], a); focusAt(next.r, next.c); }
    else { const next = moveGrid(pos.c, visible.length, cols, a); focusAt(0, next); }
  }, !guide);
  const setRef = (r: number, c: number, el: HTMLButtonElement | null) => { refs.current[r] ??= []; refs.current[r][c] = el; };
  const showcase = games.filter(g => g.kind === "arcade");
  const routeTiles = [{ label: "My games & apps", icon: Library, path: "/console/library", image: showcase[1] }, { label: "Customize Home", icon: Paintbrush, path: "/console/settings" }, { label: "Discover cloud games", icon: Gamepad2, path: "/console/store", image: showcase[3] }, { label: media ? "App Store" : "Entertainment", icon: Film, path: media ? "/console/store" : "/console/media", image: showcase[5] }];
  const links = [{ label: "Home", icon: Home, path: "/console" }, { label: "Games", icon: Gamepad2, path: "/console/library" }, { label: "Store", icon: ShoppingBag, path: "/console/store" }, { label: "Movies & TV", icon: Film, path: "/console/media" }, { label: "Apps", icon: Library, path: "/console/apps" }, { label: "Settings", icon: Settings, path: "/console/settings" }];
  const filters = store ? [{ id: "all", title: "All games & apps" }, { id: "arcade", title: "Arcade games" }, { id: "cloud", title: "Cloud games" }, { id: "apps", title: "Entertainment apps" }] : [{ id: "all", title: "Full library" }, { id: "games", title: "Games" }, { id: "apps", title: "Apps" }, { id: "wishlist", title: "Favorites" }, { id: "queue", title: "Queue" }];
  const selectFilter = (id: string) => { setFilter(id); setPos({ r: 0, c: 0 }); };
  return <ConsoleShell>
    {isHome && current && p.consoleBg !== "custom" && consoleArtwork(current) && <div className="xbox-game-backdrop pointer-events-none absolute inset-0"><img key={current.id} src={consoleArtwork(current)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer"/><div className="absolute inset-0 xbox-home-shade"/></div>}
    <div className="relative flex h-full flex-col">
      <header className="xbox-topbar flex shrink-0 items-center justify-between gap-4 px-6 py-5 md:px-12 md:py-7">
        <Button variant="console" size="console" onClick={() => go("/console/profile")} className="xbox-control min-w-0 justify-start gap-3 p-1" aria-label="My profile"><Avatar initial={initial} className="size-10 shrink-0"/><span className="hidden min-w-0 text-left sm:block"><span className="block max-w-48 truncate text-sm">{name}</span><span className="text-xs text-console-foreground/65">{lib.installed.length} installed · Series X</span></span></Button>
        <nav className="flex items-center gap-1 md:gap-4" aria-label="Console navigation">{[{ icon: Gamepad2, label: "Open Xbox guide", action: () => setGuide(true) }, { icon: Library, label: "My games & apps", action: () => go("/console/library") }, { icon: ShoppingBag, label: "Game Store", action: () => go("/console/store") }, { icon: Film, label: "Entertainment", action: () => go("/console/media") }, { icon: Search, label: "Search games", action: () => { if (store) search.current?.focus(); else void go("/console/store"); } }, { icon: Settings, label: "Settings", action: () => go("/console/settings") }].map(item => <Button key={item.label} variant="console" size="console" aria-label={item.label} title={item.label} onClick={item.action} className="xbox-control size-10 rounded-full md:size-11"><item.icon/></Button>)}</nav>
        {p.showClock && <span className="hidden shrink-0 text-base md:block">{clock}</span>}
      </header>
      {isHome ? <main className="xbox-home-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-12 md:px-12">
        <div className="xbox-home-intro flex flex-col justify-end pb-8"><span className="text-xs uppercase text-console-foreground/65">BirchBlock / Xbox Series X</span><h1 className="mt-2 text-3xl font-medium md:text-4xl">{media ? "Entertainment" : current?.title ?? "Home"}</h1><div className="mt-4 flex gap-3"><Button variant="console" size="console" onClick={() => current && (lib.installed.includes(current.id) || current.kind === "app" && !current.installable ? playGame(current, go) : setDetails(current))} className="xbox-control bg-console-foreground px-6 py-2.5 text-console-ink"><Play/>{media ? "Open" : current && lib.installed.includes(current.id) ? "Jump back in" : "View game"}</Button><Button variant="console" size="console" onClick={() => go(media ? "/console" : "/console/media")} className="xbox-control bg-console-panel/80 px-5 py-2.5">{media ? "Games" : "Media"}<ChevronRight/></Button></div></div>
        <div className="xbox-recent-row flex items-end gap-4 overflow-x-auto px-2 py-3 -mx-2" aria-label={media ? "Media apps" : "Recent games"}>{!homeItems.length && !media && <div className="flex h-40 min-w-72 flex-col justify-center gap-3 rounded-sm bg-console-panel/80 p-5"><p className="text-base">No games downloaded yet</p><Button variant="console" size="console" onClick={() => go("/console/store")} className="xbox-control self-start bg-xbox-accent px-5 py-2.5 text-console-ink"><ShoppingBag/>Get games in the Store</Button></div>}{homeItems.map((g, i) => <Button variant="console" size="console" ref={el => setRef(0, i, el)} key={g.id} aria-label={g.title} onFocus={() => setPos({ r: 0, c: i })} onMouseEnter={() => setPos({ r: 0, c: i })} onClick={() => lib.installed.includes(g.id) || g.kind === "app" && !g.installable ? playGame(g, go) : setDetails(g)} className={cn("xbox-game-tile xbox-control relative shrink-0 overflow-hidden rounded-sm bg-console-panel", pos.r === 0 && pos.c === i && "xbox-selected")}><GameArt game={g} title={false}/><span className="absolute inset-x-0 bottom-0 truncate bg-console-ink/85 px-3 py-2 text-left text-sm">{g.title}</span></Button>)}</div>
        <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{routeTiles.map((t, i) => <Button ref={el => setRef(1, i, el)} key={t.label} variant="console" size="console" className="xbox-promo xbox-control relative aspect-video flex-col overflow-hidden rounded-sm bg-console-panel" onFocus={() => setPos({ r: 1, c: i })} onClick={() => go(t.path)}>{t.image && <GameArt game={t.image} title={false}/>}<span className="absolute inset-0 bg-console-ink/40"/><t.icon className="absolute top-5 size-8"/><span className="absolute inset-x-0 bottom-0 bg-console-ink/75 p-3 text-left text-base">{t.label}</span></Button>)}</section>
        <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl">{media ? "More entertainment" : "Your games & apps"}</h2><Button variant="console" size="console" className="xbox-control gap-2 p-2 text-sm" onClick={() => go("/console/store")}>View all<ChevronRight/></Button></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{(media ? APPS.filter(g => g.installable) : ownedShelf).map((g, i) => <Button key={g.id} ref={el => setRef(2, i, el)} variant="console" size="console" className="xbox-control aspect-square overflow-hidden rounded-sm" onFocus={() => setPos({ r: 2, c: i })} onClick={() => setDetails(g)} aria-label={g.title}><GameArt game={g}/></Button>)}</div></section>
      </main> : <div className="flex min-h-0 flex-1">
        <aside className="xbox-store-nav hidden w-52 shrink-0 bg-console-panel/90 p-5 lg:block"><h2 className="mb-6 flex items-center gap-3 text-lg"><Gamepad2 className="text-xbox-accent"/>Series X</h2>{links.map(l => <Button variant="console" size="console" key={l.label} onClick={() => go(l.path)} className={cn("xbox-control mb-2 w-full justify-start gap-3 px-3 py-3 text-left", l.path === `/console/${screen}` && "bg-console-foreground/15")}><l.icon/>{l.label}</Button>)}</aside>
        <main className="min-w-0 flex-1 overflow-y-auto px-5 pb-10 md:px-8">
          <header className="mb-6 flex flex-wrap items-center gap-4"><Button variant="console" size="console" className="xbox-control size-10" aria-label="Console home" title="Console home" onClick={() => go("/console")}><ArrowLeft/></Button><h1 className="text-3xl font-medium">{store ? "Game Store" : apps ? "Apps" : "My games & apps"}</h1><span className="text-sm text-console-foreground/60">{visible.length} titles</span></header>
          <div className="mb-6 flex flex-wrap gap-3"><label className="relative min-w-40 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-console-foreground/60"/><input ref={search} type="search" value={query} onChange={e => { setQuery(e.target.value); setPos({ r: 0, c: 0 }); }} placeholder="Search games & apps" aria-label="Search games and apps" className="console-input w-full pl-10"/></label><select className="console-input" aria-label="Sort games" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="az">Name A–Z</option><option value="za">Name Z–A</option></select></div>
          {!apps && <nav className="mb-7 flex gap-2 overflow-x-auto border-b border-console-foreground/15 pb-4" aria-label="Library filters">{filters.map(f => <Button key={f.id} variant="console" size="console" aria-pressed={filter === f.id} onClick={() => selectFilter(f.id)} className={cn("xbox-control shrink-0 px-4 py-3", filter === f.id ? "bg-xbox-accent text-console-ink" : "bg-console-panel")}>{f.id === "wishlist" ? <Heart/> : f.id === "queue" ? <Download/> : null}{f.title}</Button>)}</nav>}
          {visible.length ? <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{visible.map((g, i) => <div key={g.id} className="min-w-0"><Button ref={el => setRef(0, i, el)} variant="console" size="console" aria-label={g.title} className="xbox-control relative aspect-square w-full overflow-hidden rounded-sm" onFocus={() => setPos({ r: 0, c: i })} onClick={() => setDetails(g)}><GameArt game={g} title={false}/>{lib.wishlist.includes(g.id) && <Heart className="absolute right-3 top-3 fill-xbox-accent text-xbox-accent"/>}</Button><h2 className="mt-3 truncate font-medium">{g.title}</h2><div className="mt-1 flex items-center justify-between gap-2 text-xs text-console-foreground/60"><span>{g.kind === "cloud" ? "Cloud" : g.kind === "arcade" ? "Arcade" : "App"}</span><span>{statusOf(g, lib)}</span></div>{lib.progress[g.id] !== undefined && <progress max={100} value={lib.progress[g.id]} className="console-progress mt-2 w-full"/>}<Button variant="console" size="console" disabled={g.id in lib.progress} onClick={() => actOn(g, lib, go)} className="xbox-control mt-3 w-full bg-console-panel px-3 py-2 text-xs">{lib.installed.includes(g.id) || g.kind === "app" && !g.installable ? <Play/> : <Download/>}{statusOf(g, lib)}</Button></div>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center"><Library className="size-10 text-console-foreground/40"/><h2 className="text-xl">{query ? "No matching titles" : filter === "queue" ? "Your queue is empty" : filter === "wishlist" ? "No favorites yet" : "Your library is ready for games"}</h2>{!query && <Button variant="console" size="console" onClick={() => go("/console/store")} className="xbox-control bg-xbox-accent px-6 py-3 text-console-ink"><ShoppingBag/>Browse games</Button>}</div>}
        </main>
      </div>}
    </div>
    {details && <GameDetails game={details} lib={lib} close={() => setDetails(null)}/>}
    {guide && <XboxGuide close={() => setGuide(false)}/>}
  </ConsoleShell>;
}