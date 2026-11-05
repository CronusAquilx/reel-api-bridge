export function guestCanSave(): false { return false; }
export function guestCanUse(feature: string): boolean { return ["games", "movies", "music", "web", "appearance"].includes(feature); }