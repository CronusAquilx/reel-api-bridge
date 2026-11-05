import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getSocial, socialAction } from "./social.functions";
import type { z } from "zod";
import type { socialInput } from "./rules";
export const socialOptions = queryOptions({ queryKey: ["social"], queryFn: () => getSocial(), staleTime: 5000 });
export function useSocialAction() {
  const client = useQueryClient(); const act = useServerFn(socialAction);
  return useMutation({ mutationFn: (data: z.infer<typeof socialInput>) => act({ data }), onSuccess: (_result, input) => { if(input.action==="profile")toast.success("Social settings saved."); if(input.action==="report")toast.success("Report received."); return client.invalidateQueries({ queryKey: ["social"] }); }, onError: (e: Error) => toast.error(e.message) });
}