CREATE TABLE public.developer_games (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
 kind text NOT NULL CHECK (kind IN ('arcade','cloud')),
 url text NOT NULL CHECK (url ~ '^https://[^[:space:]]+$'),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,url)
);
GRANT SELECT, INSERT, DELETE ON public.developer_games TO authenticated;
GRANT ALL ON public.developer_games TO service_role;
ALTER TABLE public.developer_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in players read developer games" ON public.developer_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Developers add games" ON public.developer_games FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Developers remove games" ON public.developer_games FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));