import { siSpotify, siCrunchyroll, siGooglechrome, siSteam } from "simple-icons";
import { Bot, Brain, Home, Mic, Settings, Users, ShoppingBag, Palette, LayoutTemplate, SlidersHorizontal, Sparkles, Clock, Calculator, Ruler, CloudSun, Globe2, Timer, Hourglass, CalendarDays, KeyRound, Receipt, Cake, StickyNote, ListChecks, Target, Type, Flame, Layers, Brush, Dices, Keyboard, Zap, Music2, Wind, Droplets, HeartPulse, Braces, Binary, Pipette, MonitorSmartphone, type LucideIcon } from "lucide-react";
const TOOL_ICONS: Record<string, LucideIcon> = { "theme-studio": Palette, "layout-switcher": LayoutTemplate, "ui-tuner": SlidersHorizontal, effects: Sparkles, "clock-style": Clock, calculator: Calculator, converter: Ruler, weather: CloudSun, "world-clock": Globe2, stopwatch: Timer, timer: Hourglass, calendar: CalendarDays, password: KeyRound, tip: Receipt, age: Cake, notes: StickyNote, todo: ListChecks, pomodoro: Target, "word-count": Type, habits: Flame, flashcards: Layers, paint: Brush, dice: Dices, typing: Keyboard, reaction: Zap, metronome: Music2, breathe: Wind, water: Droplets, bmi: HeartPulse, json: Braces, base64: Binary, "color-picker": Pipette, "screen-info": MonitorSmartphone };

export function AppIcon({ app, className }: { app: string; className?: string }) {
  const brand = app === "music" ? siSpotify : app === "movies" ? siCrunchyroll : app === "web" ? siGooglechrome : app === "games" ? siSteam : null;
  if (brand) return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d={brand.path}/></svg>;
  if (app === "store") return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M9 11h2v2H9zM13 11h2v2h-2zM9 15h2v2H9zM13 15h2v2h-2z" fill="currentColor" stroke="none"/></svg>;
  const icons: Record<string, LucideIcon> = { home: Home, chat: Bot, memory: Brain, voice: Mic, settings: Settings, social: Users };
  const Icon = (app.startsWith("tool:") ? TOOL_ICONS[app.slice(5)] : icons[app]) ?? ShoppingBag;
  return <Icon className={className}/>;
}