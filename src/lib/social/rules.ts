import { z } from "zod";

export const handleSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use 3–24 letters, numbers or underscores.");
export const socialInput = z.object({ action: z.enum(["profile", "request", "accept", "remove", "block", "unblock", "party", "invite", "join", "leave", "post", "delete_post", "report"]), payload: z.record(z.union([z.string(), z.boolean()])).default({}) });
export function safeSocialLink(link: string) {
  return /^\/(console|music|movies|games)(\/|\?|$)/.test(link) && !/[\\\r\n]/.test(link) && link.length <= 1500;
}