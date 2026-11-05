CREATE FUNCTION public.social_party_owner(p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM social_parties WHERE id=p AND owner_id=auth.uid()); $$;
CREATE FUNCTION public.social_party_visible(p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (EXISTS(SELECT 1 FROM social_parties WHERE id=p AND owner_id=auth.uid()) OR EXISTS(SELECT 1 FROM social_members WHERE party_id=p AND user_id=auth.uid())); $$;
REVOKE ALL ON FUNCTION public.social_party_owner(uuid),public.social_party_visible(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_party_owner(uuid),public.social_party_visible(uuid) TO authenticated;
DROP POLICY "visible parties" ON public.social_parties;
CREATE POLICY "visible parties" ON public.social_parties FOR SELECT TO authenticated USING(public.social_party_visible(id));
DROP POLICY "party members" ON public.social_members;
CREATE POLICY "party members" ON public.social_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR (joined AND public.social_member(party_id,auth.uid())) OR public.social_party_owner(party_id));