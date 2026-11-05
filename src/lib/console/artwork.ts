import racing from "@/assets/console-racing.jpg";
import action from "@/assets/console-action.jpg";
import arcade from "@/assets/console-arcade.jpg";
import world from "@/assets/console-world.jpg";

/** Bundled genre illustration used when a game's own thumbnail is missing or fails to load. */
export function fallbackArtwork(title: string, kind: "cloud" | "arcade" | "app") {
  if (kind === "app") return undefined;
  if (/race|racing|rally|kart|drift|turismo|speed|burnout|midnight club|road rash|f1\b/i.test(title)) return racing;
  if (/craft|bloxd|voxel|island|sandbox|world/i.test(title)) return world;
  return kind === "arcade" ? arcade : action;
}

/** Prefer the thumbnail from the game's source site; fall back to the genre illustration. */
export function consoleArtwork(game: { title: string; kind: "cloud" | "arcade" | "app"; cover?: string | undefined }) {
  return game.cover ?? fallbackArtwork(game.title, game.kind);
}
