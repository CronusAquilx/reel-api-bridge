CREATE OR REPLACE FUNCTION public.is_site_owner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _uid AND lower(email) = 'qaisdev@gmail.org')
$$;

CREATE TABLE public.banned_devices (
  device_id text PRIMARY KEY,
  label text,
  banned_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.banned_devices TO authenticated;
GRANT ALL ON public.banned_devices TO service_role;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "developers read bans" ON public.banned_devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "developers ban" ON public.banned_devices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND banned_by = auth.uid());
CREATE POLICY "developers unban" ON public.banned_devices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_device_banned(_device text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT public.is_site_owner(auth.uid()) AND EXISTS (SELECT 1 FROM public.banned_devices WHERE device_id = _device)
$$;
GRANT EXECUTE ON FUNCTION public.is_device_banned(text) TO anon, authenticated;

CREATE TABLE public.dev_accounts (
  handle text PRIMARY KEY,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.dev_accounts TO authenticated;
GRANT ALL ON public.dev_accounts TO service_role;
ALTER TABLE public.dev_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "developers read dev accounts" ON public.dev_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "developers add dev accounts" ON public.dev_accounts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target IS NOT NULL AND NEW.kind IN ('kick','pause','ban') AND public.is_site_owner(NEW.target) THEN
    RAISE EXCEPTION 'The owner cannot be kicked, paused or banned';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_site_owner BEFORE INSERT ON public.site_commands FOR EACH ROW EXECUTE FUNCTION public.protect_site_owner();