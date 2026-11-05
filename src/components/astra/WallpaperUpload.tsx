import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { setAppearance } from "@/lib/astra/prefs";
import type { AppearanceLayout } from "@/lib/astra/appearance";

export function WallpaperUpload({ layout }: { layout: AppearanceLayout }) {
  const { user, guest } = useAuth(); const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function upload(file: File) {
    setError(""); if (!(/^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm))$/.test(file.type))) { setError("Choose an image, GIF, MP4 or WebM video. MP3 is audio, not a wallpaper."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("Choose a wallpaper under 50 MB."); return; }
    setBusy(true);
    try {
      let url: string;
      if (guest || !user) url = URL.createObjectURL(file);
      else {
        const path = `${user.id}/${layout}-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error: failure } = await supabase.storage.from("backgrounds").upload(path, file, { contentType: file.type });
        if (failure) throw failure;
        const { data, error: linkError } = await supabase.storage.from("backgrounds").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (linkError || !data) throw linkError ?? new Error("Couldn't open the image.");
        url = data.signedUrl;
      }
      const media = { artwork: true, wallpaperPoster: "", wallpaperType: file.type.startsWith("video/") ? "video" as const : "image" as const };
      setAppearance(layout, layout === "sony" || layout === "series" || layout === "wii" || layout === "neutral" ? { ...media, consoleCustomBg: url, consoleBg: "custom" } : { ...media, customBg: url });
    } catch { setError("Couldn't upload the wallpaper. Please try again."); } finally { setBusy(false); }
  }
  return <div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" aria-label="Upload wallpaper image" className="hidden" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }}/><Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload/>{busy ? "Uploading…" : "Upload wallpaper"}</Button>{guest && <p className="mt-2 text-xs text-muted-foreground">This visit only</p>}{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>;
}