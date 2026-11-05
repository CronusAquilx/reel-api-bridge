import { getPrefsSnapshot, setPrefs } from "@/lib/astra/prefs";

export type ArcadeShortcutGame = { id: number; name: string; author: string; file: string; cover: string; url?: string };
export type DesktopShortcut =
  | { id: string; kind: "movie"; title: string; mediaType: "movie" | "tv"; tmdbId: number; image?: string }
  | { id: string; kind: "cloud"; title: string; url: string; image?: string }
  | { id: string; kind: "arcade"; title: string; game: ArcadeShortcutGame; image?: string };
export function mergeShortcut(list: DesktopShortcut[], shortcut: DesktopShortcut) { return [...list.filter(item => item.id !== shortcut.id), shortcut]; }
export function addDesktopShortcut(shortcut: DesktopShortcut) { setPrefs({ desktopShortcuts: mergeShortcut(getPrefsSnapshot().desktopShortcuts ?? [], shortcut) }); }
export function removeDesktopShortcut(id: string) { setPrefs({ desktopShortcuts: (getPrefsSnapshot().desktopShortcuts ?? []).filter(item => item.id !== id) }); }