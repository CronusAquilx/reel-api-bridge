import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Shown to guests on features that need a saved account (AI chat, voice, memory, social). */
export function SignInRequired() {
  return <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-8 text-center">
    <LogIn className="size-8 opacity-70" />
    <p className="text-lg font-medium">Sign in with an account to use this feature.</p>
  </div>;
}

export function AccountOnly({ children }: { children: ReactNode }) {
  const { guest, session } = useAuth();
  return guest && !session ? <SignInRequired /> : <>{children}</>;
}

export const ACCOUNT_ONLY_PATHS = ["/chat", "/voice", "/memory", "/console/social"];
export const isAccountOnlyPath = (p: string) => ACCOUNT_ONLY_PATHS.some(x => p === x || p.startsWith(x + "/"));
