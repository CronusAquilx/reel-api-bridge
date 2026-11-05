import { AccountOnly, isAccountOnlyPath } from "@/components/astra/SignInRequired";
import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth, readGuest } from "@/lib/auth";
import { AstraMark } from "@/components/astra/Mark";
import { usePrefs } from "@/lib/astra/prefs";
import { ConsoleOnboarding } from "@/components/console/ConsoleOnboarding";
import { AppShell } from "@/components/astra/AppShell";
import { ConsoleAppFrame, isConsoleMediaPath } from "@/components/console/ConsoleAppFrame";
import { WindowsDesktop } from "@/components/windows/WindowsDesktop";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, guest } = useAuth();
  const { pathname } = useLocation();
  const prefs = usePrefs();
  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <AstraMark className="size-8" pulsing />
      </div>
    );
  // Cloud games open /play in a fresh tab that has no guest flag; the player needs no account.
  if (pathname === "/play") return <Outlet />;
  if (!session && !guest && !readGuest()) return <Navigate to="/auth" replace />;
  // The full-tab game player shows only the game (no sidebar or welcome prompts).
  if (pathname === "/play" || pathname.startsWith("/console")) return isAccountOnlyPath(pathname) ? <AccountOnly><Outlet /></AccountOnly> : <Outlet />;
  if (prefs.layout === "windows" && prefs.console === "off") return <WindowsDesktop>{isAccountOnlyPath(pathname) ? <AccountOnly><Outlet /></AccountOnly> : <Outlet />}</WindowsDesktop>;
  // In Console Mode, Music, Movies and AI open in the PS5 frame instead of the classic sidebar layout.
  if (prefs.console !== "off" && isConsoleMediaPath(pathname))
    return (
      <ConsoleAppFrame>
        {isAccountOnlyPath(pathname) ? <AccountOnly><Outlet /></AccountOnly> : <Outlet />}
      </ConsoleAppFrame>
    );
  return (
    <AppShell>
      {isAccountOnlyPath(pathname) ? <AccountOnly><Outlet /></AccountOnly> : <Outlet />}
    </AppShell>
  );
}
