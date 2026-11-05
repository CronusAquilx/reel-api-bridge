ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
UPDATE public.profiles p SET username = lower(split_part(u.email, '@', 1)) FROM auth.users u WHERE p.id = u.id AND p.username IS NULL AND split_part(u.email, '@', 1) ~ '^[A-Za-z0-9_]{3,24}$' AND NOT EXISTS (SELECT 1 FROM auth.users x WHERE x.id <> u.id AND lower(split_part(x.email, '@', 1)) = lower(split_part(u.email, '@', 1)));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles(lower(username));
CREATE TABLE public.account_attempts (bucket text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, started_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.account_attempts TO service_role;
ALTER TABLE public.account_attempts ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.allow_account_attempt(_bucket text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.account_attempts(bucket) VALUES (_bucket) ON CONFLICT(bucket) DO UPDATE SET attempts = CASE WHEN account_attempts.started_at < now() - interval '15 minutes' THEN 1 ELSE account_attempts.attempts + 1 END, started_at = CASE WHEN account_attempts.started_at < now() - interval '15 minutes' THEN now() ELSE account_attempts.started_at END RETURNING attempts INTO n;
 RETURN n <= 20;
END $$;
REVOKE ALL ON FUNCTION public.allow_account_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_account_attempt(text) TO service_role;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, display_name, avatar_url, username) VALUES(new.id, coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'avatar_url',CASE WHEN new.email LIKE '%@username.beanblock.local' THEN lower(split_part(new.email,'@',1)) ELSE NULL END) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'user') ON CONFLICT DO NOTHING;
 RETURN new;
END $$;