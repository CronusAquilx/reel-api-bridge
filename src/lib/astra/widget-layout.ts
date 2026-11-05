export const WIDGET_NAMES = { weather: "Weather", notes: "Notes", music: "Music", calendar: "Calendar", timer: "Focus timer", stopwatch: "Stopwatch", calculator: "Calculator", links: "Quick links" } as const;
export type WidgetKind = keyof typeof WIDGET_NAMES;
export type DesktopWidget = { id: string; kind: WidgetKind; title: string; x: number; y: number; width: number; height: number; glass: boolean };
export function widgetBounds(widget: DesktopWidget, width: number, height: number): DesktopWidget {
  const w = Math.min(Math.max(220, widget.width), width);
  const h = Math.min(Math.max(160, widget.height), height);
  return { ...widget, width: w, height: h, x: Math.max(0, Math.min(widget.x, width - w)), y: Math.max(0, Math.min(widget.y, height - h)) };
}
export function newWidget(kind: WidgetKind, id: string, index: number): DesktopWidget {
  return { id, kind, title: WIDGET_NAMES[kind], x: index % 3 === 1 ? 110 : 760, y: index % 3 === 0 ? 12 : 220, width: 252, height: kind === "calendar" ? 300 : 194, glass: true };
}