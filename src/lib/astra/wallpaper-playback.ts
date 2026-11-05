/** Explicit video choices override motion limits only for this wallpaper, not other effects. */
export function shouldPlayWallpaper({ hidden, playback, reduceMotion, performance, systemReducedMotion }: {
  hidden: boolean; playback: boolean | undefined; reduceMotion: boolean; performance: boolean; systemReducedMotion: boolean;
}) {
  return !hidden && (playback ?? !(reduceMotion || performance || systemReducedMotion));
}