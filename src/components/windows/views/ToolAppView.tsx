import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ACCENTS, PALETTES, setAppearance, getAppearance, setPrefs, usePrefs, type Prefs } from "@/lib/astra/prefs";
import { activeLayout, LAYOUT_NAMES, VISIBLE_LAYOUTS, type AppearanceProfile } from "@/lib/astra/appearance";
import { visitDestination } from "@/lib/console/visit";
import { toolById } from "@/lib/windows/tool-apps";

function useStored<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  useEffect(() => { try { const r = localStorage.getItem(`birch-tool-${key}`); if (r) setV(JSON.parse(r) as T); } catch { /* ignore */ } }, [key]);
  const set = (n: T) => { setV(n); try { localStorage.setItem(`birch-tool-${key}`, JSON.stringify(n)); } catch { /* ignore */ } };
  return [v, set] as const;
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-2">{children}</div>;
const Big = ({ children }: { children: React.ReactNode }) => <div className="font-mono text-5xl font-semibold tabular-nums">{children}</div>;
const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(Math.floor(ms % 1000 / 10)).padStart(2, "0")}`; };
const beep = () => { try { const c = new AudioContext(); const o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + 0.15); } catch { /* no audio */ } };

function useLook() { const p = usePrefs(); const layout = activeLayout(p); return { p, layout, look: getAppearance(p, layout), set: (patch: Partial<AppearanceProfile>) => setAppearance(layout, patch) }; }

function ThemeStudio() {
  const { look, set } = useLook();
  return <div className="space-y-5">
    <div><h3 className="mb-2 font-medium">Mode</h3><Row>{(["dark", "light"] as const).map(m => <Button key={m} variant={look.mode === m ? "default" : "secondary"} onClick={() => set({ mode: m })}>{m}</Button>)}</Row></div>
    <div><h3 className="mb-2 font-medium">Accent</h3><Row>{(Object.keys(ACCENTS) as Prefs["accent"][]).map(a => <button key={a} aria-label={a} onClick={() => set({ accent: a, customAccent: "" })} className="size-9 rounded-full border-2" style={{ background: ACCENTS[a], borderColor: look.accent === a && !look.customAccent ? "var(--foreground)" : "transparent" }}/>)}<input type="color" aria-label="Custom accent" value={look.customAccent || "#22d3ee"} onChange={e => set({ customAccent: e.target.value })} className="size-9 cursor-pointer rounded-full"/></Row></div>
    <div><h3 className="mb-2 font-medium">Palette</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(PALETTES) as Prefs["palette"][]).map(k => <Button key={k} variant={look.palette === k ? "default" : "secondary"} className="justify-start gap-2" onClick={() => set({ palette: k })}><span className="flex">{PALETTES[k].swatch.slice(0, 3).map(c => <i key={c} className="size-3 rounded-full" style={{ background: c }}/>)}</span>{PALETTES[k].name}</Button>)}</div></div>
  </div>;
}
function LayoutSwitcher() {
  const p = usePrefs();
  const go = (l: string) => { const patch = ["windows", "macos", "ipad", "switch", "classic", "launcher"].includes(l) ? { layout: l as Prefs["layout"], console: "off" as const } : { console: l as Prefs["console"] }; setPrefs(patch); window.location.assign(visitDestination({ ...p, ...patch })); };
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{VISIBLE_LAYOUTS.map(l => <Button key={l} variant={activeLayout(p) === l ? "default" : "secondary"} className="h-20 text-base" onClick={() => go(l)}>{LAYOUT_NAMES[l]}</Button>)}</div>;
}
function UiTuner() {
  const { look, set } = useLook();
  return <div className="space-y-6">
    <label className="block space-y-2"><span>Text size · {look.fontScale}%</span><Slider min={80} max={130} step={5} value={[look.fontScale]} onValueChange={v => set({ fontScale: v[0] ?? 100 })}/></label>
    <label className="block space-y-2"><span>Corner roundness · {look.radius}</span><Slider min={0} max={24} step={1} value={[look.radius]} onValueChange={v => set({ radius: v[0] ?? 12 })}/></label>
    <div><h3 className="mb-2">Window style</h3><Row>{(["solid", "glass", "liquid"] as const).map(t => <Button key={t} variant={look.appTransparency === t ? "default" : "secondary"} onClick={() => set({ appTransparency: t })}>{t}</Button>)}</Row></div>
    <div><h3 className="mb-2">Spacing</h3><Row>{(["compact", "comfortable"] as const).map(t => <Button key={t} variant={look.density === t ? "default" : "secondary"} onClick={() => set({ density: t })}>{t}</Button>)}</Row></div>
    <div><h3 className="mb-2">Icon size</h3><Row>{(["small", "standard", "large"] as const).map(t => <Button key={t} variant={look.tileSize === t ? "default" : "secondary"} onClick={() => set({ tileSize: t })}>{t}</Button>)}</Row></div>
  </div>;
}
function Effects() { const { look, set } = useLook(); return <Row>{(["off", "stars", "rain", "snow", "fireflies"] as const).map(t => <Button key={t} size="lg" variant={look.particles === t ? "default" : "secondary"} onClick={() => set({ particles: t })}>{t}</Button>)}</Row>; }
function ClockStyle() { const { look, set } = useLook(); return <Row>{(["clean", "rounded", "serif", "digital"] as const).map(t => <Button key={t} size="lg" variant={look.clockFont === t ? "default" : "secondary"} onClick={() => set({ clockFont: t })}>{t}</Button>)}</Row>; }

function Calculator() {
  const [e, setE] = useState(""); const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];
  const calc = () => { if (!/^[\d+\-*/.() ]+$/.test(e)) return; try { setE(String(Function(`"use strict";return (${e})`)())); } catch { setE("Error"); } };
  return <div className="mx-auto max-w-xs space-y-3"><div className="rounded-lg bg-muted p-4 text-right font-mono text-3xl">{e || "0"}</div><div className="grid grid-cols-4 gap-2">{keys.map(k => <Button key={k} variant={/\d|\./.test(k) ? "secondary" : "default"} className="h-14 text-xl" onClick={() => k === "=" ? calc() : setE(e === "Error" ? k : e + k)}>{k}</Button>)}<Button variant="outline" className="col-span-4" onClick={() => setE("")}>Clear</Button></div></div>;
}
const UNITS: Record<string, Record<string, number>> = { Length: { m: 1, km: 1000, cm: 0.01, mi: 1609.344, ft: 0.3048, in: 0.0254 }, Weight: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 } };
function Converter() {
  const [v, setV] = useState("1"); const n = Number(v) || 0;
  return <div className="space-y-4"><Input value={v} onChange={e => setV(e.target.value)} type="number"/>{Object.entries(UNITS).map(([k, u]) => <div key={k}><h3 className="mb-1 font-medium">{k} (from {Object.keys(u)[0]})</h3><Row>{Object.entries(u).map(([name, f]) => <span key={name} className="rounded bg-muted px-2 py-1 text-sm">{+(n / f).toPrecision(6)} {name}</span>)}</Row></div>)}<div><h3 className="mb-1 font-medium">Temperature</h3><Row><span className="rounded bg-muted px-2 py-1 text-sm">{n}°C = {+(n * 9 / 5 + 32).toFixed(2)}°F</span><span className="rounded bg-muted px-2 py-1 text-sm">{n}°F = {+((n - 32) * 5 / 9).toFixed(2)}°C</span></Row></div></div>;
}
function Weather() {
  const [city, setCity] = useState("Chicago"); const [out, setOut] = useState<string>("");
  const go = async () => { setOut("Loading…"); try { const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json() as { results?: { latitude: number; longitude: number; name: string; country: string }[] }; const r = g.results?.[0]; if (!r) { setOut("City not found"); return; } const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)).json() as { current: { temperature_2m: number; wind_speed_10m: number }; daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[] } }; setOut(`${r.name}, ${r.country}: ${w.current.temperature_2m}°C, wind ${w.current.wind_speed_10m} km/h\n` + w.daily.time.map((d, i) => `${d}  ${w.daily.temperature_2m_min[i]}° / ${w.daily.temperature_2m_max[i]}°`).join("\n")); } catch { setOut("Weather unavailable"); } };
  return <div className="space-y-3"><Row><Input className="max-w-xs" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && void go()}/><Button onClick={() => void go()}>Get forecast</Button></Row><pre className="whitespace-pre-wrap font-mono text-sm">{out}</pre></div>;
}
function WorldClock() {
  const [now, setNow] = useState(new Date()); useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const zones = ["America/Los_Angeles", "America/Chicago", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];
  return <div className="grid gap-2 sm:grid-cols-3">{zones.map(z => <div key={z} className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{z.split("/")[1]?.replace("_", " ")}</p><p className="font-mono text-2xl">{now.toLocaleTimeString([], { timeZone: z, hour: "2-digit", minute: "2-digit" })}</p></div>)}</div>;
}
function Stopwatch() {
  const [t, setT] = useState(0); const [run, setRun] = useState(false); const [laps, setLaps] = useState<number[]>([]); const start = useRef(0);
  useEffect(() => { if (!run) return; start.current = Date.now() - t; const i = setInterval(() => setT(Date.now() - start.current), 31); return () => clearInterval(i); }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="space-y-4 text-center"><Big>{fmt(t)}</Big><Row><Button onClick={() => setRun(!run)}>{run ? "Pause" : "Start"}</Button><Button variant="secondary" onClick={() => setLaps([t, ...laps])} disabled={!run}>Lap</Button><Button variant="outline" onClick={() => { setRun(false); setT(0); setLaps([]); }}>Reset</Button></Row>{laps.map((l, i) => <p key={i} className="font-mono text-sm">Lap {laps.length - i}: {fmt(l)}</p>)}</div>;
}
function Countdown({ preset }: { preset?: number[] }) {
  const [left, setLeft] = useState((preset?.[0] ?? 5) * 60); const [run, setRun] = useState(false);
  useEffect(() => { if (!run) return; const i = setInterval(() => setLeft(l => { if (l <= 1) { setRun(false); beep(); beep(); return 0; } return l - 1; }), 1000); return () => clearInterval(i); }, [run]);
  return <div className="space-y-4 text-center"><Big>{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</Big><Row>{(preset ?? [1, 3, 5, 10, 15, 30]).map(m => <Button key={m} variant="secondary" onClick={() => { setLeft(m * 60); setRun(false); }}>{m} min</Button>)}</Row><Row><Button onClick={() => setRun(!run)} disabled={!left}>{run ? "Pause" : "Start"}</Button></Row></div>;
}
function Calendar() {
  const [d, setD] = useState(new Date()); const y = d.getFullYear(), m = d.getMonth(); const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate(); const today = new Date();
  return <div className="mx-auto max-w-md"><Row><Button variant="ghost" onClick={() => setD(new Date(y, m - 1))}>‹</Button><h3 className="flex-1 text-center font-semibold">{d.toLocaleString([], { month: "long", year: "numeric" })}</h3><Button variant="ghost" onClick={() => setD(new Date(y, m + 1))}>›</Button></Row><div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">{["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <b key={i} className="text-muted-foreground">{x}</b>)}{Array.from({ length: first }, (_, i) => <span key={`e${i}`}/>)}{Array.from({ length: days }, (_, i) => <span key={i} className={`rounded p-2 ${today.getFullYear() === y && today.getMonth() === m && today.getDate() === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>)}</div></div>;
}
function Password() {
  const [len, setLen] = useState(16); const [pw, setPw] = useState("");
  const gen = () => { const cs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_"; const a = crypto.getRandomValues(new Uint32Array(len)); setPw(Array.from(a, x => cs[x % cs.length]).join("")); };
  useEffect(gen, [len]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="space-y-4"><div className="break-all rounded-lg bg-muted p-4 font-mono text-xl">{pw}</div><label className="block space-y-2"><span>Length · {len}</span><Slider min={8} max={64} value={[len]} onValueChange={v => setLen(v[0] ?? 16)}/></label><Row><Button onClick={gen}>Regenerate</Button><Button variant="secondary" onClick={() => void navigator.clipboard.writeText(pw)}>Copy</Button></Row></div>;
}
function Tip() {
  const [bill, setBill] = useState("50"); const [pct, setPct] = useState(18); const [ppl, setPpl] = useState("2"); const total = (Number(bill) || 0) * (1 + pct / 100); const each = total / Math.max(1, Number(ppl) || 1);
  return <div className="max-w-sm space-y-3"><Input type="number" value={bill} onChange={e => setBill(e.target.value)} aria-label="Bill"/><Row>{[10, 15, 18, 20, 25].map(p => <Button key={p} variant={pct === p ? "default" : "secondary"} onClick={() => setPct(p)}>{p}%</Button>)}</Row><Input type="number" value={ppl} onChange={e => setPpl(e.target.value)} aria-label="People"/><p className="text-lg">Total ${total.toFixed(2)} · <b>${each.toFixed(2)} each</b></p></div>;
}
function Age() {
  const [b, setB] = useState("2005-01-01"); const born = new Date(b); const now = new Date(); const ok = !isNaN(+born);
  let y = now.getFullYear() - born.getFullYear(); if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) y--;
  return <div className="space-y-3"><Input type="date" value={b} onChange={e => setB(e.target.value)} className="max-w-xs"/>{ok && <p className="text-xl">{y} years old · {Math.floor((+now - +born) / 864e5).toLocaleString()} days alive</p>}</div>;
}
function Notes() { const [t, setT] = useStored("notes", ""); return <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="Write anything…" className="h-full min-h-[300px] bg-star/10 text-base"/>; }
function Todo() {
  const [items, setItems] = useStored<{ t: string; d: boolean }[]>("todo", []); const [v, setV] = useState("");
  const add = () => { if (v.trim()) { setItems([...items, { t: v.trim(), d: false }]); setV(""); } };
  return <div className="space-y-3"><Row><Input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Add a task" className="max-w-sm"/><Button onClick={add}>Add</Button></Row>{items.map((it, i) => <label key={i} className="flex items-center gap-2"><input type="checkbox" checked={it.d} onChange={() => setItems(items.map((x, j) => j === i ? { ...x, d: !x.d } : x))}/><span className={it.d ? "line-through text-muted-foreground" : ""}>{it.t}</span><Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Button></label>)}</div>;
}
function WordCount() { const [t, setT] = useState(""); const w = t.trim() ? t.trim().split(/\s+/).length : 0; return <div className="space-y-2"><Textarea value={t} onChange={e => setT(e.target.value)} className="min-h-[240px]"/><p>{w} words · {t.length} characters · ~{Math.ceil(w / 230)} min read</p></div>; }
function Habits() {
  const [h, setH] = useStored<{ name: string; days: string[] }[]>("habits", []); const [v, setV] = useState(""); const today = new Date().toISOString().slice(0, 10);
  return <div className="space-y-3"><Row><Input value={v} onChange={e => setV(e.target.value)} placeholder="New habit" className="max-w-sm"/><Button onClick={() => { if (v.trim()) { setH([...h, { name: v.trim(), days: [] }]); setV(""); } }}>Add</Button></Row>{h.map((x, i) => <div key={i} className="flex items-center gap-3 rounded-lg bg-muted p-3"><span className="flex-1">{x.name}</span><span className="text-sm text-muted-foreground">{x.days.length} days</span><Button size="sm" variant={x.days.includes(today) ? "default" : "secondary"} onClick={() => setH(h.map((y, j) => j === i ? { ...y, days: y.days.includes(today) ? y.days.filter(d => d !== today) : [...y.days, today] } : y))}>{x.days.includes(today) ? "Done today" : "Mark today"}</Button></div>)}</div>;
}
function Flashcards() {
  const [cards, setCards] = useStored<{ q: string; a: string }[]>("cards", []); const [q, setQ] = useState(""); const [a, setA] = useState(""); const [i, setI] = useState(0); const [flip, setFlip] = useState(false); const c = cards[i % Math.max(1, cards.length)];
  return <div className="space-y-4">{c && <button className="flex h-40 w-full items-center justify-center rounded-xl bg-muted p-4 text-xl" onClick={() => setFlip(!flip)}>{flip ? c.a : c.q}</button>}{c && <Row><Button variant="secondary" onClick={() => { setI(i + 1); setFlip(false); }}>Next card</Button><span className="text-sm text-muted-foreground">{cards.length} cards · tap to flip</span></Row>}<Row><Input placeholder="Question" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs"/><Input placeholder="Answer" value={a} onChange={e => setA(e.target.value)} className="max-w-xs"/><Button onClick={() => { if (q && a) { setCards([...cards, { q, a }]); setQ(""); setA(""); } }}>Add card</Button></Row></div>;
}
function Paint() {
  const ref = useRef<HTMLCanvasElement>(null); const [color, setColor] = useState("#22d3ee"); const [size, setSize] = useState(6); const drawing = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (ref.current!.width / r.width), (e.clientY - r.top) * (ref.current!.height / r.height)] as const; };
  return <div className="space-y-2"><Row><input type="color" value={color} onChange={e => setColor(e.target.value)}/><Slider className="w-40" min={1} max={40} value={[size]} onValueChange={v => setSize(v[0] ?? 6)}/><Button variant="secondary" onClick={() => ref.current?.getContext("2d")?.clearRect(0, 0, 1200, 800)}>Clear</Button><Button variant="secondary" onClick={() => { const l = document.createElement("a"); l.href = ref.current!.toDataURL(); l.download = "drawing.png"; l.click(); }}>Save</Button></Row><canvas ref={ref} width={1200} height={800} className="w-full touch-none rounded-lg border bg-card" onPointerDown={e => { drawing.current = true; const c = ref.current!.getContext("2d")!; const [x, y] = pos(e); c.beginPath(); c.moveTo(x, y); }} onPointerMove={e => { if (!drawing.current) return; const c = ref.current!.getContext("2d")!; const [x, y] = pos(e); c.strokeStyle = color; c.lineWidth = size; c.lineCap = "round"; c.lineTo(x, y); c.stroke(); }} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }}/></div>;
}
function Dice() { const [r, setR] = useState<string>("🎲"); return <div className="space-y-4 text-center"><Big>{r}</Big><Row>{[4, 6, 8, 10, 12, 20].map(n => <Button key={n} variant="secondary" onClick={() => setR(String(1 + Math.floor(Math.random() * n)))}>d{n}</Button>)}<Button onClick={() => setR(Math.random() < 0.5 ? "Heads" : "Tails")}>Flip coin</Button></Row></div>; }
const SENTENCE = "the quick brown fox jumps over the lazy dog while bright stars glow above the quiet sleeping city";
function Typing() {
  const [t, setT] = useState(""); const [start, setStart] = useState(0); const done = t === SENTENCE; const wpm = done ? Math.round(SENTENCE.split(" ").length / ((Date.now() - start) / 60000)) : 0;
  return <div className="space-y-3"><p className="rounded-lg bg-muted p-3 font-mono">{SENTENCE.split("").map((ch, i) => <span key={i} className={i < t.length ? (t[i] === ch ? "text-primary" : "text-destructive") : ""}>{ch}</span>)}</p><Input value={t} onChange={e => { if (!start) setStart(Date.now()); if (!done) setT(e.target.value); }} placeholder="Start typing…"/>{done && <p className="text-xl">{wpm} words per minute</p>}<Button variant="secondary" onClick={() => { setT(""); setStart(0); }}>Restart</Button></div>;
}
function Reaction() {
  const [s, setS] = useState<"idle" | "wait" | "go" | number>("idle"); const at = useRef(0); const tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const click = () => { if (s === "wait") { clearTimeout(tm.current); setS("idle"); return; } if (s === "go") { setS(Date.now() - at.current); return; } setS("wait"); tm.current = setTimeout(() => { at.current = Date.now(); setS("go"); }, 1000 + Math.random() * 3000); };
  return <button onClick={click} className={`flex h-64 w-full items-center justify-center rounded-xl text-2xl font-semibold ${s === "go" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s === "idle" ? "Click to start" : s === "wait" ? "Wait for it…" : s === "go" ? "CLICK!" : `${s} ms — click to retry`}</button>;
}
function Metronome() {
  const [bpm, setBpm] = useState(100); const [on, setOn] = useState(false); const [tick, setTick] = useState(0);
  useEffect(() => { if (!on) return; const i = setInterval(() => { beep(); setTick(t => t + 1); }, 60000 / bpm); return () => clearInterval(i); }, [on, bpm]);
  return <div className="space-y-4 text-center"><Big>{bpm} BPM</Big><div className={`mx-auto size-6 rounded-full ${tick % 2 ? "bg-primary" : "bg-muted"}`}/><Slider min={40} max={220} value={[bpm]} onValueChange={v => setBpm(v[0] ?? 100)}/><Button onClick={() => setOn(!on)}>{on ? "Stop" : "Start"}</Button></div>;
}
function Breathe() {
  const [phase, setPhase] = useState(0); useEffect(() => { const i = setInterval(() => setPhase(p => (p + 1) % 3), 4000); return () => clearInterval(i); }, []);
  const label = ["Breathe in", "Hold", "Breathe out"][phase];
  return <div className="flex h-72 flex-col items-center justify-center gap-6"><div className="rounded-full bg-primary/40 transition-all duration-[4000ms] ease-in-out" style={{ width: phase === 2 ? 60 : 200, height: phase === 2 ? 60 : 200 }}/><p className="text-2xl">{label}</p></div>;
}
function Water() {
  const today = new Date().toISOString().slice(0, 10); const [d, setD] = useStored<{ day: string; n: number }>("water", { day: today, n: 0 }); const n = d.day === today ? d.n : 0;
  return <div className="space-y-4 text-center"><Big>{n} / 8</Big><p className="text-3xl">{"💧".repeat(n)}</p><Row><Button onClick={() => setD({ day: today, n: n + 1 })}>+ Glass</Button><Button variant="outline" onClick={() => setD({ day: today, n: 0 })}>Reset</Button></Row></div>;
}
function Bmi() {
  const [h, setH] = useState("170"); const [w, setW] = useState("65"); const bmi = (Number(w) || 0) / ((Number(h) || 1) / 100) ** 2;
  return <div className="max-w-xs space-y-3"><Input type="number" value={h} onChange={e => setH(e.target.value)} aria-label="Height cm" placeholder="Height (cm)"/><Input type="number" value={w} onChange={e => setW(e.target.value)} aria-label="Weight kg" placeholder="Weight (kg)"/><p className="text-xl">BMI {bmi.toFixed(1)} · {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese"}</p></div>;
}
function Json() {
  const [t, setT] = useState('{"hello":"world"}'); const out = useMemo(() => { try { return JSON.stringify(JSON.parse(t), null, 2); } catch (e) { return `Invalid JSON: ${(e as Error).message}`; } }, [t]);
  return <div className="grid h-full gap-3 sm:grid-cols-2"><Textarea value={t} onChange={e => setT(e.target.value)} className="min-h-[300px] font-mono"/><pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-sm">{out}</pre></div>;
}
function Base64() {
  const [t, setT] = useState(""); const safe = (f: () => string) => { try { return f(); } catch { return "—"; } };
  return <div className="space-y-3"><Textarea value={t} onChange={e => setT(e.target.value)} placeholder="Text…"/>{[["Base64 encode", () => btoa(unescape(encodeURIComponent(t)))], ["Base64 decode", () => decodeURIComponent(escape(atob(t)))], ["URL encode", () => encodeURIComponent(t)], ["URL decode", () => decodeURIComponent(t)]].map(([k, f]) => <div key={k as string}><p className="text-xs text-muted-foreground">{k as string}</p><p className="break-all font-mono text-sm">{safe(f as () => string)}</p></div>)}</div>;
}
function ColorPicker() {
  const [c, setC] = useState("#22d3ee"); const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, dd = mx - mn, s = dd ? dd / (1 - Math.abs(2 * l - 1)) : 0;
  let hh = 0; if (dd) { const [R, G, B] = [r / 255, g / 255, b / 255]; hh = mx === R ? ((G - B) / dd) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4; hh = Math.round(hh * 60 + 360) % 360; }
  return <div className="space-y-3"><input type="color" value={c} onChange={e => setC(e.target.value)} className="h-32 w-full cursor-pointer rounded-lg"/><p className="font-mono">{c.toUpperCase()} · rgb({r}, {g}, {b}) · hsl({hh}, {Math.round(s * 100)}%, {Math.round(l * 100)}%)</p></div>;
}
function ScreenInfo() {
  const [info, setInfo] = useState<[string, string][]>([]);
  useEffect(() => { const n = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number }; deviceMemory?: number }; setInfo([["Screen", `${screen.width}×${screen.height} @ ${devicePixelRatio}x`], ["Window", `${innerWidth}×${innerHeight}`], ["Cores", String(n.hardwareConcurrency ?? "?")], ["Memory", n.deviceMemory ? `${n.deviceMemory} GB` : "?"], ["Connection", n.connection ? `${n.connection.effectiveType} · ${n.connection.downlink} Mbps` : "?"], ["Language", n.language], ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone], ["Browser", n.userAgent]]); }, []);
  return <dl className="grid gap-2">{info.map(([k, v]) => <div key={k} className="rounded bg-muted p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-all text-sm">{v}</dd></div>)}</dl>;
}

const VIEWS: Record<string, () => React.ReactNode> = {
  "theme-studio": () => <ThemeStudio/>, "layout-switcher": () => <LayoutSwitcher/>, "ui-tuner": () => <UiTuner/>, effects: () => <Effects/>, "clock-style": () => <ClockStyle/>,
  calculator: () => <Calculator/>, converter: () => <Converter/>, weather: () => <Weather/>, "world-clock": () => <WorldClock/>, stopwatch: () => <Stopwatch/>, timer: () => <Countdown/>, calendar: () => <Calendar/>, password: () => <Password/>, tip: () => <Tip/>, age: () => <Age/>,
  notes: () => <Notes/>, todo: () => <Todo/>, pomodoro: () => <Countdown preset={[25, 5, 15, 50]}/>, "word-count": () => <WordCount/>, habits: () => <Habits/>, flashcards: () => <Flashcards/>,
  paint: () => <Paint/>, dice: () => <Dice/>, typing: () => <Typing/>, reaction: () => <Reaction/>, metronome: () => <Metronome/>,
  breathe: () => <Breathe/>, water: () => <Water/>, bmi: () => <Bmi/>, json: () => <Json/>, base64: () => <Base64/>, "color-picker": () => <ColorPicker/>, "screen-info": () => <ScreenInfo/>,
};

export function ToolAppView({ id }: { id: string }) {
  const tool = toolById(id);
  return <div className="h-full overflow-auto p-6"><h1 className="mb-1 text-2xl font-semibold">{tool?.title ?? "App"}</h1><p className="mb-6 text-sm text-muted-foreground">{tool?.detail}</p>{VIEWS[id]?.() ?? <p>App not found</p>}</div>;
}
