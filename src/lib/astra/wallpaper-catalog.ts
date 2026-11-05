import type { AppearanceLayout, AppearanceProfile } from "./appearance";

export type CatalogWallpaper = {
  id: string;
  title: string;
  source: string;
  video: string;
  image: string;
  resolution: string;
  originalQuality?: boolean;
  categories?: WallpaperCategory[];
  addedAt?: string;
};

export const WALLPAPER_CATEGORIES = ["All", "Anime", "Gaming", "Nature", "Space", "Cars", "City", "Abstract", "Fantasy", "Cozy", "Animals", "Movies & TV", "Seasonal"] as const;
export type WallpaperCategory = Exclude<typeof WALLPAPER_CATEGORIES[number], "All">;

const CATEGORY_PATTERNS: Record<WallpaperCategory, RegExp> = {
  Anime: /anime|naruto|boruto|goku|dragon ball|one piece|zoro|luffy|killua|hunter x hunter|ghibli|jujutsu|gojo|demon slayer|tanjiro|nezuko|attack on titan|levi|bleach|ichigo|tokyo ghoul|black clover|asta|evangelion|sailor|chainsaw|makima|frieren|fern|jinwoo|solo leveling|berserk|guts|maomao|manga|hatsune|miku|waifu|evergarden/i,
  Gaming: /game|gaming|genshin|honkai|valorant|fortnite|minecraft|cyberpunk 2077|elden ring|counter strike|league of legends|subnautica|nier|zelda|mario|pokemon|overwatch|halo|destiny|witcher|warcraft|warhammer|fallout|assassin|call of duty|red dead|gta|wuwa|wuthering|steam/i,
  Nature: /nature|landscape|lake|mountain|forest|tree|river|ocean|sea\b|beach|waterfall|flower|sakura|cherry blossom|sunset|sunrise|rain|snow|winter|spring|autumn|meadow|garden|alpine|cloud|aurora/i,
  Space: /space|galaxy|nebula|planet|cosmos|cosmic|starry|starlit|milky way|astronaut|moon|solar|black hole|universe|saturn|mars|earth/i,
  Cars: /car\b|cars\b|porsche|mclaren|ferrari|lamborghini|bmw|mercedes|nissan|supra|mustang|jdm|gt3|formula|motorcycle|motorbike|racing|dodge|bugatti|audi|mazda/i,
  City: /city|street|tokyo|nyc|new york|building|skyline|urban|neon|cyberpunk|hong kong|japan|alley|rooftop|traffic|town/i,
  Abstract: /abstract|rgb|fluid|liquid|geometric|minimal|wave|swirl|particle|fractal|gradient|flame|fire\b|glow|energy|vortex|oled/i,
  Fantasy: /fantasy|dragon|samurai|knight|castle|magic|angel|demon|sword|myth|gothic|sci-fi|scifi|sorcer|witch\b/i,
  Cozy: /cozy|lofi|lo-fi|chill|bedroom|room|cafe|coffee|cabin|fireplace|study|sleep|relax|cottage|library/i,
  Animals: /animal|cat\b|cats\b|kitten|dog\b|puppy|wolf|fox|tiger|lion|bird|fish|aquarium|whale|butterfly|panda|rabbit|horse/i,
  "Movies & TV": /movie|batman|spider.?man|marvel|hulk|iron man|avenger|superman|joker|star wars|mandalorian|darth|stranger things|transformers|deadpool|gwen|miles morales/i,
  Seasonal: /halloween|christmas|holiday|festiv|pumpkin|santa|valentine|new year/i,
};

export function wallpaperCategories(item: CatalogWallpaper): WallpaperCategory[] {
  const inferred = WALLPAPER_CATEGORIES.filter((category): category is WallpaperCategory => category !== "All" && CATEGORY_PATTERNS[category].test(item.title));
  return [...new Set([...(item.categories ?? []), ...inferred])];
}

export function upgradeWallpaperSource(src: string, upgrades: Record<string, string>): string {
  if (upgrades[src]) return upgrades[src];
  try {
    const path = new URL(src, "https://wallpaper.local").pathname;
    return upgrades[path] ?? src;
  } catch { return src; }
}

export function wallpaperPatch(layout: AppearanceLayout, item: CatalogWallpaper): Partial<AppearanceProfile> {
  const media = { wallpaperType: "video" as const, wallpaperPoster: item.image, wallpaperPlayback: true, artwork: true };
  return ["sony", "series", "wii", "neutral"].includes(layout)
    ? { ...media, consoleCustomBg: item.video, consoleBg: "custom" }
    : { ...media, customBg: item.video };
}

function normalizeSearch(text: string) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function filterWallpapers(items: CatalogWallpaper[], query: string, category: typeof WALLPAPER_CATEGORIES[number] = "All") {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const categories = wallpaperCategories(item);
    const text = normalizeSearch(`${item.title} ${item.resolution} ${categories.join(" ")}`);
    return (category === "All" || categories.includes(category)) && words.every(word => text.includes(word));
  });
}