CREATE TABLE public.site_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('message','pause','resume','kick')),
  target uuid,
  message text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.site_commands TO authenticated;
GRANT ALL ON public.site_commands TO service_role;
ALTER TABLE public.site_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own or global commands" ON public.site_commands FOR SELECT TO authenticated
  USING (target IS NULL OR target = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "developers send commands" ON public.site_commands FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_commands;