import { useEffect, useRef, useState } from "react";
import { usePrefs } from "@/lib/astra/prefs";

export type NavAction = "up" | "down" | "left" | "right" | "select" | "back" | "prev" | "next" | "options" | "menu";

const KEYS: Record<string, NavAction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Enter: "select", " ": "select", Escape: "back", Backspace: "back",
  q: "prev", Q: "prev", e: "next", E: "next", o: "options", O: "options", g: "menu", G: "menu",
};

// Standard gamepad mapping: 0=A, 1=B, 3=Y, 4=LB, 5=RB, 8/9=back/start, 12-15=D-pad
const PAD: Record<number, NavAction> = { 0: "select", 1: "back", 3: "options", 4: "prev", 5: "next", 8: "menu", 9: "menu", 12: "up", 13: "down", 14: "left", 15: "right" };

export function useConsoleInput(handler: (a: NavAction) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  const { consoleSounds } = usePrefs();
  const sounds = useRef(consoleSounds);
  sounds.current = consoleSounds;
  useEffect(() => {
    if (!enabled) return;
    let audio: AudioContext | undefined;
    const dispatch = (a: NavAction) => {
      if (sounds.current && ["up", "down", "left", "right", "prev", "next"].includes(a)) {
        try {
          audio ??= new AudioContext();
          void audio.resume();
          const oscillator = audio.createOscillator(); const gain = audio.createGain();
          oscillator.frequency.value = 620; gain.gain.setValueAtTime(0.025, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.06);
          oscillator.connect(gain); gain.connect(audio.destination);
          oscillator.start(); oscillator.stop(audio.currentTime + 0.07);
        } catch { /* audio unavailable */ }
      }
      ref.current(a);
    };
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const a = KEYS[ev.key];
      if (a === "select" && t?.closest("button")) return;
      if (t?.closest("[role=dialog]") && a !== "back") return;
      if (a) { ev.preventDefault(); dispatch(a); }
    };
    window.addEventListener("keydown", onKey);
    const was: Record<number, boolean> = {};
    let lastStick = 0;
    let raf = 0;
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (!pad) continue;
        for (const [k, a] of Object.entries(PAD)) {
          const b = Number(k);
          const id = pad.index * 100 + b;
          const pressed = !!pad.buttons[b]?.pressed;
          if (pressed && !was[id]) {
            const focused = document.activeElement;
            if (a === "select" && focused instanceof HTMLButtonElement) focused.click();
            else dispatch(a);
          }
          was[id] = pressed;
        }
        const now = performance.now();
        const x = pad.axes[0] ?? 0;
        const y = pad.axes[1] ?? 0;
        if ((Math.abs(x) > 0.6 || Math.abs(y) > 0.6) && now - lastStick > 180) {
          lastStick = now;
          if (Math.abs(x) > Math.abs(y)) dispatch(x > 0 ? "right" : "left");
          else dispatch(y > 0 ? "down" : "up");
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); if (audio) void audio.close(); };
  }, [enabled]);
}

export function moveGrid(index: number, count: number, cols: number, a: NavAction): number {
  if (a === "left") return index % cols > 0 ? index - 1 : index;
  if (a === "right") return index % cols < cols - 1 && index + 1 < count ? index + 1 : index;
  if (a === "up") return index - cols >= 0 ? index - cols : index;
  if (a === "down") return index + cols < count ? index + cols : index;
  return index;
}

/** Move across horizontal shelves of different lengths. */
export function moveShelf(pos: { r: number; c: number }, lens: number[], a: NavAction) {
  let { r, c } = pos;
  if (a === "left") c = Math.max(0, c - 1);
  else if (a === "right") c = Math.min(Math.max(0, (lens[r] ?? 0) - 1), c + 1);
  else if (a === "up" || a === "down") {
    const step = a === "up" ? -1 : 1;
    let nr = r + step;
    while (nr >= 0 && nr < lens.length && lens[nr] === 0) nr += step;
    if (nr >= 0 && nr < lens.length) { r = nr; c = Math.min(c, (lens[r] ?? 0) - 1); }
  }
  return { r, c };
}

export function useCols(lg = 5, md = 3, sm = 2) {
  const get = () => (typeof window === "undefined" ? lg : window.innerWidth >= 1024 ? lg : window.innerWidth >= 640 ? md : sm);
  const [c, setC] = useState(get);
  useEffect(() => { const f = () => setC(get()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return c;
}