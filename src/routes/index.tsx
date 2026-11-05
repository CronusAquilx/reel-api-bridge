import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { visitDestination } from "@/lib/console/visit";
import { usePrefs } from "@/lib/astra/prefs";
import { AstraMark } from "@/components/astra/Mark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Birch OS — Choose your space" },
      { name: "description", content: "Your personal Birch OS desktop with console, Windows, macOS and iPad layouts, live wallpapers, games and music." },
      { property: "og:title", content: "Birch OS — Choose your space" },
      { property: "og:description", content: "Make Birch OS yours with eight layouts and a searchable collection of live wallpapers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading, guest } = useAuth();
  const p = usePrefs();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center sky">
        <AstraMark className="size-8" pulsing />
      </div>
    );
  return <Navigate to={session || guest ? visitDestination(p) : "/auth"} replace />;
}
