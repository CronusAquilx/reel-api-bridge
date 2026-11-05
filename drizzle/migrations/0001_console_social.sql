CREATE TABLE public.social_players (user_id uuid PRIMARY KEY, handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,24}$'), status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','busy','invisible')), allow_requests boolean NOT NULL DEFAULT true, share_activity boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.social_players TO authenticated; GRANT ALL ON public.social_players TO service_role;
ALTER TABLE public.social_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player directory" ON public.social_players FOR SELECT TO authenticated USING (true);
CREATE TABLE public.social_blocks (user_id uuid NOT NULL, target_id uuid NOT NULL, PRIMARY KEY(user_id,target_id), CHECK(user_id <> target_id));
GRANT SELECT ON public.social_blocks TO authenticated; GRANT ALL ON public.social_blocks TO service_role;
ALTER TABLE public.social_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks" ON public.social_blocks FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.social_friends (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL, recipient_id uuid NOT NULL, accepted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), CHECK(sender_id <> recipient_id));
CREATE UNIQUE INDEX social_friend_pair ON public.social_friends (least(sender_id,recipient_id),greatest(sender_id,recipient_id));
GRANT SELECT ON public.social_friends TO authenticated; GRANT ALL ON public.social_friends TO service_role;
ALTER TABLE public.social_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connections" ON public.social_friends FOR SELECT TO authenticated USING(auth.uid() IN(sender_id,recipient_id));
CREATE TABLE public.social_parties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 60), kind text NOT NULL CHECK(kind IN('games','movies','music')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.social_parties TO authenticated; GRANT ALL ON public.social_parties TO service_role;
ALTER TABLE public.social_parties ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.social_members (party_id uuid NOT NULL REFERENCES public.social_parties(id) ON DELETE CASCADE, user_id uuid NOT NULL, joined boolean NOT NULL DEFAULT false, PRIMARY KEY(party_id,user_id));
GRANT SELECT ON public.social_members TO authenticated; GRANT ALL ON public.social_members TO service_role;
ALTER TABLE public.social_members ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.social_blocked(a uuid,b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM social_blocks WHERE (user_id=a AND target_id=b) OR (user_id=b AND target_id=a)); $$;
CREATE FUNCTION public.social_member(p uuid,u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM social_members WHERE party_id=p AND user_id=u AND joined); $$;
CREATE POLICY "visible parties" ON public.social_parties FOR SELECT TO authenticated USING(owner_id=auth.uid() OR EXISTS(SELECT 1 FROM social_members WHERE party_id=id AND user_id=auth.uid()));
CREATE POLICY "party members" ON public.social_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.social_member(party_id,auth.uid()));
CREATE TABLE public.social_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, channel text NOT NULL CHECK(channel IN('global','feed','party')), party_id uuid REFERENCES public.social_parties(id) ON DELETE CASCADE, content text NOT NULL CHECK(char_length(content) BETWEEN 1 AND 1000), link text, created_at timestamptz NOT NULL DEFAULT now(), CHECK ((channel='party')=(party_id IS NOT NULL)));
GRANT SELECT ON public.social_posts TO authenticated; GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX social_posts_recent ON public.social_posts(created_at DESC);
CREATE POLICY "visible posts" ON public.social_posts FOR SELECT TO authenticated USING(NOT public.social_blocked(auth.uid(),user_id) AND (channel='global' OR (channel='party' AND public.social_member(party_id,auth.uid())) OR (channel='feed' AND (user_id=auth.uid() OR EXISTS(SELECT 1 FROM social_friends WHERE accepted AND auth.uid() IN(sender_id,recipient_id) AND user_id IN(sender_id,recipient_id))))));
CREATE TABLE public.social_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,post_id));
GRANT SELECT ON public.social_reports TO authenticated; GRANT ALL ON public.social_reports TO service_role;
ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.social_reports FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.social_action(action text, payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); t uuid; p uuid; r social_friends; txt text;
BEGIN
IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF action='profile' THEN
INSERT INTO social_players(user_id,handle,status,allow_requests,share_activity) VALUES(u,lower(trim(payload->>'handle')),coalesce(payload->>'status','online'),coalesce((payload->>'allow_requests')::boolean,true),coalesce((payload->>'share_activity')::boolean,true)) ON CONFLICT(user_id) DO UPDATE SET handle=excluded.handle,status=excluded.status,allow_requests=excluded.allow_requests,share_activity=excluded.share_activity;
RETURN '{}'::jsonb;
END IF;
IF NOT EXISTS(SELECT 1 FROM social_players WHERE user_id=u) THEN RAISE EXCEPTION 'Choose a player handle first'; END IF;
IF action='request' THEN
SELECT user_id INTO t FROM social_players WHERE handle=lower(trim(payload->>'handle')) AND allow_requests;
IF t IS NULL OR t=u OR social_blocked(u,t) THEN RAISE EXCEPTION 'Player is unavailable'; END IF;
INSERT INTO social_friends(sender_id,recipient_id) VALUES(u,t) ON CONFLICT DO NOTHING;
ELSIF action='accept' THEN
UPDATE social_friends SET accepted=true WHERE id=(payload->>'id')::uuid AND recipient_id=u;
ELSIF action='remove' THEN
DELETE FROM social_friends WHERE id=(payload->>'id')::uuid AND u IN(sender_id,recipient_id);
ELSIF action='block' THEN
 t:=(payload->>'id')::uuid;
INSERT INTO social_blocks VALUES(u,t) ON CONFLICT DO NOTHING;
DELETE FROM social_friends WHERE u IN(sender_id,recipient_id) AND t IN(sender_id,recipient_id);
DELETE FROM social_members WHERE user_id=t AND party_id IN(SELECT id FROM social_parties WHERE owner_id=u);
DELETE FROM social_members WHERE user_id=u AND party_id IN(SELECT id FROM social_parties WHERE owner_id=t);
ELSIF action='unblock' THEN DELETE FROM social_blocks WHERE user_id=u AND target_id=(payload->>'id')::uuid;
ELSIF action='party' THEN
INSERT INTO social_parties(owner_id,name,kind) VALUES(u,trim(payload->>'name'),payload->>'kind') RETURNING id INTO p;
INSERT INTO social_members VALUES(p,u,true); RETURN jsonb_build_object('id',p);
ELSIF action='invite' THEN
p:=(payload->>'party')::uuid; t:=(payload->>'id')::uuid;
IF NOT EXISTS(SELECT 1 FROM social_parties WHERE id=p AND owner_id=u) OR NOT EXISTS(SELECT 1 FROM social_friends WHERE accepted AND u IN(sender_id,recipient_id) AND t IN(sender_id,recipient_id)) OR social_blocked(u,t) THEN RAISE EXCEPTION 'Invite unavailable'; END IF;
INSERT INTO social_members VALUES(p,t,false) ON CONFLICT DO NOTHING;
ELSIF action='join' THEN
UPDATE social_members SET joined=true WHERE party_id=(payload->>'party')::uuid AND user_id=u AND NOT social_blocked(u,(SELECT owner_id FROM social_parties WHERE id=(payload->>'party')::uuid));
ELSIF action='leave' THEN
p:=(payload->>'party')::uuid;
IF EXISTS(SELECT 1 FROM social_parties WHERE id=p AND owner_id=u) THEN DELETE FROM social_parties WHERE id=p AND owner_id=u; ELSE DELETE FROM social_members WHERE party_id=p AND user_id=u; END IF;
ELSIF action='post' THEN
PERFORM pg_advisory_xact_lock(hashtext(u::text));
IF EXISTS(SELECT 1 FROM social_posts WHERE user_id=u AND created_at>now()-interval '2 seconds') THEN RAISE EXCEPTION 'Wait a moment before sending again'; END IF;
IF payload->>'channel'='feed' AND NOT EXISTS(SELECT 1 FROM social_players WHERE user_id=u AND share_activity) THEN RAISE EXCEPTION 'Activity sharing is disabled'; END IF;
p:=nullif(payload->>'party','')::uuid;
IF payload->>'channel'='party' AND NOT social_member(p,u) THEN RAISE EXCEPTION 'Join this party first'; END IF;
txt:=nullif(payload->>'link','');
IF txt IS NOT NULL AND (txt !~ '^/(console|music|movies|games)(/|\?|$)' OR txt ~ '[\\\r\n]' OR length(txt)>1500) THEN RAISE EXCEPTION 'Invalid shared destination'; END IF;
INSERT INTO social_posts(user_id,channel,party_id,content,link) VALUES(u,payload->>'channel',p,trim(payload->>'content'),txt);
ELSIF action='delete_post' THEN DELETE FROM social_posts WHERE id=(payload->>'id')::uuid AND user_id=u;
ELSIF action='report' THEN
IF NOT EXISTS(SELECT 1 FROM social_posts WHERE id=(payload->>'id')::uuid AND (channel='global' OR user_id=u OR social_member(party_id,u) OR EXISTS(SELECT 1 FROM social_friends WHERE accepted AND u IN(sender_id,recipient_id) AND social_posts.user_id IN(sender_id,recipient_id))) AND NOT social_blocked(u,user_id)) THEN RAISE EXCEPTION 'Message unavailable'; END IF;
INSERT INTO social_reports(user_id,post_id) VALUES(u,(payload->>'id')::uuid) ON CONFLICT DO NOTHING;
ELSE RAISE EXCEPTION 'Unknown action'; END IF;
RETURN '{}'::jsonb;
END; $$;
REVOKE ALL ON FUNCTION public.social_action(text,jsonb), public.social_member(uuid,uuid),public.social_blocked(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.social_action(text,jsonb), public.social_member(uuid,uuid),public.social_blocked(uuid,uuid) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts, public.social_friends, public.social_members;
