CREATE TABLE public.staff_roles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('helper','moderator','admin')),
  label text,
  granted_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner reads staff" ON public.staff_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_site_owner(auth.uid()));
CREATE POLICY "owner adds staff" ON public.staff_roles FOR INSERT TO authenticated WITH CHECK (public.is_site_owner(auth.uid()) AND granted_by = auth.uid());
CREATE POLICY "owner edits staff" ON public.staff_roles FOR UPDATE TO authenticated USING (public.is_site_owner(auth.uid()));
CREATE POLICY "owner removes staff" ON public.staff_roles FOR DELETE TO authenticated USING (public.is_site_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.staff_can(_uid uuid, _kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (public.is_site_owner(_uid) OR public.has_role(_uid, 'admin') OR EXISTS (
    SELECT 1 FROM public.staff_roles s WHERE s.user_id = _uid AND (
      s.role = 'admin'
      OR (s.role = 'moderator' AND _kind IN ('message','pause','resume','view','unview','announce','unannounce','reload','redirect','control','panel'))
      OR (s.role = 'helper' AND _kind IN ('message','view','unview','panel')))))
$$;

ALTER TABLE public.site_commands ADD COLUMN target_device text;
ALTER TABLE public.site_commands DROP CONSTRAINT IF EXISTS site_commands_kind_check;
ALTER TABLE public.site_commands ADD CONSTRAINT site_commands_kind_check CHECK (kind IN ('message','pause','resume','kick','ban','view','unview','redirect','reload','announce','unannounce'));
DROP POLICY IF EXISTS "developers send commands" ON public.site_commands;
CREATE POLICY "staff send commands" ON public.site_commands FOR INSERT TO authenticated WITH CHECK (public.staff_can(auth.uid(), kind) AND created_by = auth.uid());
DROP POLICY IF EXISTS "see own or global commands" ON public.site_commands;
CREATE POLICY "see own or global commands" ON public.site_commands FOR SELECT TO authenticated USING (target IS NULL OR target = auth.uid() OR public.staff_can(auth.uid(), 'panel'));

CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target IS NOT NULL AND NEW.kind IN ('kick','pause','ban','redirect','reload','announce') AND public.is_site_owner(NEW.target) THEN
    RAISE EXCEPTION 'The owner cannot be kicked, paused or banned';
  END IF;
  IF NEW.target IS NOT NULL AND NEW.kind IN ('kick','pause','ban','redirect','reload') AND NOT public.is_site_owner(auth.uid())
     AND (public.has_role(NEW.target, 'admin') OR EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = NEW.target AND role = 'admin')) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only the owner can do that to an admin';
  END IF;
  RETURN NEW;
END $$;

DROP POLICY IF EXISTS "developers ban" ON public.banned_devices;
DROP POLICY IF EXISTS "developers read bans" ON public.banned_devices;
DROP POLICY IF EXISTS "developers unban" ON public.banned_devices;
CREATE POLICY "staff ban" ON public.banned_devices FOR INSERT TO authenticated WITH CHECK (public.staff_can(auth.uid(), 'ban') AND banned_by = auth.uid());
CREATE POLICY "staff read bans" ON public.banned_devices FOR SELECT TO authenticated USING (public.staff_can(auth.uid(), 'ban'));
CREATE POLICY "staff unban" ON public.banned_devices FOR DELETE TO authenticated USING (public.staff_can(auth.uid(), 'ban'));