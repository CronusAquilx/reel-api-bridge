create type public.app_role as enum ('admin','user');
alter table public.user_roles add column role public.app_role not null default 'user';
alter table public.user_roles add constraint user_roles_user_id_role_key unique (user_id, role);
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "models readable" on public.models;
create policy "models readable" on public.models for select to authenticated using (enabled or public.has_role(auth.uid(),'admin'));
drop policy if exists "admins manage models" on public.models;
create policy "admins manage models" on public.models for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "admins manage levels" on public.reasoning_levels;
create policy "admins manage levels" on public.reasoning_levels for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "admins manage tools" on public.tools;
create policy "admins manage tools" on public.tools for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "own usage read" on public.usage_events;
create policy "own usage read" on public.usage_events for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "admins manage provider keys" on public.provider_keys;
create policy "admins manage provider keys" on public.provider_keys for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Developers add games" on public.developer_games;
create policy "Developers add games" on public.developer_games for insert to authenticated with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid());
drop policy if exists "Developers remove games" on public.developer_games;
create policy "Developers remove games" on public.developer_games for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, display_name, avatar_url, username) VALUES(new.id, coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'avatar_url',CASE WHEN new.email LIKE '%@username.beanblock.local' THEN lower(split_part(new.email,'@',1)) ELSE NULL END) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'user') ON CONFLICT DO NOTHING;
 RETURN new;
END $$;