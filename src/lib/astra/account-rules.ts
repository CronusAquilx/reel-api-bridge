import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use 3–24 letters, numbers or underscores.");
export const signupSchema = z.object({ username: usernameSchema, password: z.string().min(6, "Use at least 6 characters.").max(128), email: z.union([z.literal(""), z.string().trim().email()]).optional() });
export const loginSchema = z.object({ username: z.string().trim().toLowerCase().min(1).max(254), password: z.string().min(1).max(128) });
export const accountEmail = (username: string) => `${usernameSchema.parse(username)}@username.beanblock.local`;
export const isDeveloperHandle = (username: string) => ["qais", "qaisdev", "chance", "chancedev"].includes(username.trim().toLowerCase());
/** Hidden developer panel PIN (server-side check only). */
export const DEV_PIN = "0307";
export const isDevPin = (code: string, override?: string) => code === (override || DEV_PIN);
