import { z } from "zod";

export function normalizeGameUrl(value: string) {
  const url = new URL(value.includes("://") ? value.trim() : `https://${value.trim()}`);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.includes(":")) throw new Error("Use a public HTTPS game website.");
  return url.href;
}
export const developerGameSchema = z.object({ name: z.string().trim().min(1).max(100), kind: z.enum(["arcade", "cloud"]), url: z.string().max(2048).transform(normalizeGameUrl) });
export type DeveloperGame = { id: string; name: string; kind: "arcade" | "cloud"; url: string };
export function requireDeveloper(allowed: boolean | null) {
  if (allowed !== true) throw new Error("Developer access only.");
}