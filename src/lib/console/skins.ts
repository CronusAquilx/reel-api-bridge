import { Accessibility, Box, Database, Gamepad2, Globe, LogOut, Monitor, Sparkles, User, Users, Volume2, type LucideIcon } from "lucide-react";
import { setPrefs, type Prefs } from "@/lib/astra/prefs";

export type SkinId = "sony" | "series" | "classic" | "wii" | "neutral";
export const SKINS: SkinId[] = ["sony", "series", "wii", "neutral", "classic"];
export const SKIN_NAME: Record<SkinId, string> = { sony: "PlayStation / PS5", series: "Xbox Series X", classic: "Xbox Classic", wii: "Wii", neutral: "Neutral" };
export const resolveSkin = (c: Prefs["console"]): SkinId => (c === "off" ? "sony" : c);

export type SettingId = "guide" | "accessibility" | "network" | "users" | "family" | "system" | "storage" | "sound" | "screen" | "skin" | "exit";

export const SETTINGS: { id: SettingId; label: string; icon: LucideIcon }[] = [
  { id: "guide", label: "Guide & Tips, Health & Safety, and Other Information", icon: Sparkles },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "network", label: "Network", icon: Globe },
  { id: "users", label: "Users and Accounts", icon: User },
  { id: "family", label: "Family and Parental Controls", icon: Users },
  { id: "system", label: "System", icon: Box },
  { id: "storage", label: "Storage", icon: Database },
  { id: "sound", label: "Sound", icon: Volume2 },
  { id: "screen", label: "Screen and Video", icon: Monitor },
  { id: "skin", label: "Console Skin", icon: Gamepad2 },
  { id: "exit", label: "Exit Console Mode", icon: LogOut },
];

export function settingDetail(id: SettingId, p: Prefs, installed: number, name: string): string {
  switch (id) {
    case "guide": return "Controls: arrows or D-pad move, Enter or A selects, Esc or B goes back, Q/E or bumpers switch tabs, G opens the guide.";
    case "accessibility": return `Reduce motion: ${p.reduceMotion ? "on" : "off"}`;
    case "network": return typeof navigator !== "undefined" && navigator.onLine ? "Connected" : "Offline";
    case "users": return `Signed in as ${name}`;
    case "family": return "No restrictions set";
    case "system": return "Console Mode 1.0 - up to date";
    case "storage": return `${installed} game${installed === 1 ? "" : "s"} installed`;
    case "sound": return "Focus sounds: off";
    case "screen": return `Performance mode: ${p.perfMode ? "on" : "off"}`;
    case "skin": return SKIN_NAME[resolveSkin(p.console)];
    case "exit": return "Return to the normal home screen";
  }
}

/** Runs a setting row. Returns a short note to show the user. */
export function runSetting(id: SettingId, p: Prefs, go: (to: string) => void): string {
  switch (id) {
    case "accessibility": setPrefs({ reduceMotion: !p.reduceMotion }); return `Reduce motion ${!p.reduceMotion ? "on" : "off"}`;
    case "screen": setPrefs({ perfMode: !p.perfMode }); return `Performance mode ${!p.perfMode ? "on" : "off"}`;
    case "users": go("/console/profile"); return "";
    case "skin": {
      const next = SKINS[(SKINS.indexOf(resolveSkin(p.console)) + 1) % SKINS.length] ?? "sony";
      setPrefs({ console: next }); return `Skin: ${SKIN_NAME[next]}`;
    }
    case "exit": go("/home"); return "";
    case "sound": return "Focus sounds are off in this version.";
    default: return settingDetail(id, p, 0, "");
  }
}