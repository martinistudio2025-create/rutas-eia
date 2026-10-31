-- =========================================================
-- Panel de administración: solo los correos de la tabla admins
-- pueden leer los usuarios registrados.
-- 1. Cambia 'CAMBIAR@correo.com' por el correo con el que creaste
--    tu usuario en Authentication > Users
-- 2. Pegar completo en SQL Editor > Run
-- =========================================================

create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- Sin políticas: nadie puede leer ni modificar la lista desde la app.

insert into public.admins (email) values (lower('CAMBIAR@correo.com'))
on conflict do nothing;

-- ¿La persona que inició sesión es administradora?
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'));
$$;
grant execute on function public.es_admin() to authenticated;

-- Solo administradores pueden leer la tabla de usuarios
drop policy if exists "admins leen usuarios" on public.usuarios;
create policy "admins leen usuarios" on public.usuarios
  for select to authenticated using (public.es_admin());

notify pgrst, 'reload schema';
