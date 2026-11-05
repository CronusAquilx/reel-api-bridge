import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/movie-unavailable")({
  head: () => ({
    meta: [
      { title: "Free movies only" },
      { name: "description", content: "Full-length streaming is limited to free, legal sources." },
      { property: "og:title", content: "Free movies only" },
      { property: "og:description", content: "Full-length streaming is limited to free, legal sources." },
    ],
  }),
  component: MovieUnavailable,
});

function MovieUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-xl font-semibold text-foreground">This title isn't available to stream here</h1>
        <p className="text-sm text-muted-foreground">
          Full movies play only from free, legal sources. Open the Free &amp; Classic section in Movies to watch
          public-domain films.
        </p>
      </div>
    </div>
  );
}
