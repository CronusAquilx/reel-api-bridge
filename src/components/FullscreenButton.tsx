import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Bottom-left button that toggles the whole website in and out of browser fullscreen. */
export function WebsiteFullscreenButton({ className = "fixed bottom-3 left-3 z-[320]" }: { className?: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.error("Fullscreen isn't available in this browser or preview.");
    }
  };
  return (
    <Button
      variant="secondary"
      size="icon"
      className={`size-9 border shadow-sm ${className}`}
      aria-label={fullscreen ? "Exit website fullscreen" : "Enter website fullscreen"}
      title={fullscreen ? "Exit fullscreen" : "Fullscreen website"}
      onClick={() => void toggle()}
    >
      {fullscreen ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}
