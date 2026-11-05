ALTER TABLE public.site_commands DROP CONSTRAINT IF EXISTS site_commands_kind_check;
ALTER TABLE public.site_commands ADD CONSTRAINT site_commands_kind_check CHECK (kind IN ('message','pause','resume','kick','ban','view','unview','redirect','reload','announce','unannounce','troll','untroll'));
CREATE OR REPLACE FUNCTION public.protect_site_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target IS NOT NULL AND NEW.kind IN ('kick','pause','ban','redirect','reload','announce','troll') AND public.is_site_owner(NEW.target) THEN
    RAISE EXCEPTION 'The owner cannot be kicked, paused or banned';
  END IF;
  IF NEW.target IS NOT NULL AND NEW.kind IN ('kick','pause','ban','redirect','reload','troll') AND NOT public.is_site_owner(auth.uid())
     AND (public.has_role(NEW.target, 'admin') OR EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = NEW.target AND role = 'admin')) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only the owner can do that to an admin';
  END IF;
  RETURN NEW;
END $$;