import { createServerFn } from "@tanstack/react-start";
export const getConsoleArcade = createServerFn({method:"GET"}).handler(async () => {
 const response=await fetch("https://raw.githubusercontent.com/gn-math/assets/main/zones.json");
 if(!response.ok)throw new Error("Arcade games couldn't load. Try again.");
 const raw: unknown=await response.json();
 if(!Array.isArray(raw))throw new Error("Arcade games couldn't load. Try again.");
 return raw.filter((g):g is {id:number;name:string;url:string;cover:string;author?:string}=>!!g&&typeof g.id==="number"&&g.id>=0&&typeof g.name==="string"&&typeof g.url==="string"&&g.url.startsWith("{HTML_URL}/")&&typeof g.cover==="string")
 .map(g=>({id:g.id,name:g.name,author:g.author??"",file:g.url.replace("{HTML_URL}/",""),cover:g.cover.replace("{COVER_URL}/","")}));
});
