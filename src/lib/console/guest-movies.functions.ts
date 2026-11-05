import { createServerFn } from "@tanstack/react-start";
export const guestMovies = createServerFn({method:"GET"}).handler(async()=>{
  // Only public film metadata; no account client or private data is involved.
  const response=await fetch("https://api.themoviedb.org/3/trending/movie/week?api_key=0ea74aa80d71c4dc484c0a58f26ea7b8");
  if(!response.ok)throw new Error("Movie catalog is unavailable right now.");
  const json=await response.json() as {results?:{id:number;title:string;poster_path:string|null}[]};
  return (json.results??[]).map(m=>({id:m.id,title:m.title,poster:m.poster_path?`https://image.tmdb.org/t/p/w500${m.poster_path}`:null}));
});