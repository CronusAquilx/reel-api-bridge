import { AppIcon } from "@/components/astra/AppIcon";
import windows from "@/assets/windows-wallpaper.jpg";
import macos from "@/assets/macos-wallpaper.jpg";
import ipad from "@/assets/ipad-wallpaper.jpg";
import landscape from "@/assets/neutral-console-wallpaper.jpg";
import action from "@/assets/console-action.jpg";
import racing from "@/assets/console-racing.jpg";
import world from "@/assets/console-world.jpg";

const artworks = [action, racing, world];
const apps = ["web", "music", "games", "movies", "settings"];

/** Inert miniatures only: never mount another shell/player in the opening chooser. */
export function LayoutPreview({ layout }: { layout: string }) {
  const desktop = ["windows", "macos", "ipad"].includes(layout);
  const wallpaper = layout === "windows" ? windows : layout === "macos" ? macos : layout === "ipad" ? ipad : landscape;
  return <div className="layout-preview" data-preview={layout} aria-hidden="true">
    <img className="layout-preview-backdrop" src={wallpaper} alt="" width={480} height={270}/>
    {desktop ? <>
      <div className="layout-preview-top"><span>{layout === "macos" ? "● Birch" : ""}</span><span>◒ ▰</span></div>
      {layout === "ipad" ? <div className="layout-preview-ipad"><span className="layout-preview-clock">9:41</span><div className="layout-preview-appgrid">{apps.slice(0, 4).map(app => <span key={app} data-app={app}><AppIcon app={app}/></span>)}</div></div> : <div className="layout-preview-window"><div className="layout-preview-windowbar"><i/><i/><i/></div><div className="layout-preview-windowcontent"><span/><div>{artworks.map((src, i) => <img src={src} alt="" key={i}/>)}</div></div></div>}
      <div className="layout-preview-dock">{apps.map(app => <span key={app} data-app={app}><AppIcon app={app}/></span>)}</div>
    </> : layout === "wii" ? <><div className="layout-preview-channels">{[...artworks, ...artworks].map((src, i) => <span key={i}><img src={src} alt=""/></span>)}</div><div className="layout-preview-wii-bottom"><span>Wii</span><span>▰</span></div></> : <>
      <div className="layout-preview-consolebar"><span>{layout === "series" ? "◉ Xbox" : layout === "switch" ? "◉" : "Games   Media"}</span><span>◌</span></div>
      {layout === "neutral" && <div className="layout-preview-sidebar">{apps.slice(0, 4).map(app => <AppIcon app={app} key={app}/>)}</div>}
      <div className="layout-preview-shelf">{artworks.map((src, i) => <img src={src} alt="" key={i}/>)}</div>
      <div className="layout-preview-consolefooter">{apps.slice(0, 4).map(app => <AppIcon app={app} key={app}/>)}</div>
    </>}
  </div>;
}