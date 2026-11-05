import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { developerGameAccess, listDeveloperGames } from "./developer-games.functions";

export const developerGamesOptions = queryOptions({ queryKey: ["developer-games"], queryFn: () => listDeveloperGames(), staleTime: 60_000 });
export function useDeveloperGames() { return useQuery(developerGamesOptions); }
export function useDeveloperGameAccess() {
  const { user } = useAuth();
  const check = useServerFn(developerGameAccess);
  return useQuery({ queryKey: ["developer-game-access", user?.id], queryFn: () => check(), enabled: !!user });
}