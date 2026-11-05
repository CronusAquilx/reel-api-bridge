import { Suspense, useState } from "react";
import { Users, Share2 } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SocialHub } from "./SocialHub";
import { safeSocialLink } from "@/lib/social/rules";
import { useAuth } from "@/lib/auth";

export function SocialAccess({ floating = false }: { floating?: boolean }) {
  const {user}=useAuth();
  const navigate = useNavigate(); const { pathname, searchStr } = useLocation();
  const link = pathname + searchStr;
  if (!user || pathname === "/console/social") return null;
  return <div className={floating ? "absolute bottom-5 right-5 z-30 flex gap-2 rounded-md bg-console-panel/95 p-2" : "flex shrink-0 gap-2"}>
    <Button variant="console" size="console" title="Friends and parties" aria-label="Friends and parties" className="size-10 bg-console-foreground/10" onClick={()=>void navigate({to:"/console/social"})}><Users/></Button>
    {safeSocialLink(link)&&<SocialShare title={pathname.startsWith("/music")?"Music":pathname.startsWith("/movies")?"Movies":"Game night"} link={link}/>}
  </div>;
}
export function SocialShare({ title, link }: { title: string; link: string }) {
  const [open,setOpen]=useState(false);
  return <><Button variant="console" size="console" title="Share with friends or party" aria-label="Share with friends or party" className="size-10 bg-console-foreground/10" onClick={()=>setOpen(true)}><Share2/></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent aria-describedby={undefined} className="dark console-shell flex h-[min(720px,90dvh)] w-[calc(100%-24px)] max-w-4xl flex-col bg-console-panel text-console-foreground"><DialogTitle className="pr-8">Share · {title}</DialogTitle><div className="min-h-0 flex-1"><Suspense fallback={<p>Loading social…</p>}><SocialHub initialTab="parties" sharedTitle={title} sharedLink={link}/></Suspense></div></DialogContent></Dialog></>;
}