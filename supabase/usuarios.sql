-- =========================================================
-- Registro de usuarios (sin contraseña, una sola vez por celular)
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- =========================================================

create table if not exists public.usuarios (
  correo        text primary key check (correo ~* '^[a-z0-9._%+-]+@eia\.edu\.co$'),
  nombre        text not null check (length(nombre) between 3 and 80),
  rol           text not null check (rol in ('Estudiante', 'Docente', 'Administrativo', 'Otro')),
  carrera       text not null check (length(carrera) between 2 and 80),
  ruta_habitual int  check (ruta_habitual between 1 and 7),
  acepta_datos  boolean not null check (acepta_datos),
  creado        timestamptz not null default now(),
  ultima_visita timestamptz not null default now()
);
alter table public.usuarios enable row level security;
-- Sin políticas = nadie puede leer la lista de usuarios desde la app.
-- Los datos se ven solo desde el panel de Supabase (Table Editor).

-- Registrar o actualizar (si el correo ya existe, actualiza sus datos)
create or replace function public.registrar_usuario(
  p_correo text, p_nombre text, p_rol text, p_carrera text, p_ruta int, p_acepta boolean
) returns void
language sql security definer set search_path = public as $$
  insert into usuarios (correo, nombre, rol, carrera, ruta_habitual, acepta_datos)
  values (lower(trim(p_correo)), trim(p_nombre), p_rol, trim(p_carrera), p_ruta, p_acepta)
  on conflict (correo) do update
    set nombre = excluded.nombre, rol = excluded.rol, carrera = excluded.carrera,
        ruta_habitual = excluded.ruta_habitual, acepta_datos = excluded.acepta_datos,
        ultima_visita = now();
$$;

grant execute on function public.registrar_usuario to anon;
