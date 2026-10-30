-- =========================================================
-- Rutas EIA - Base de datos en Supabase
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Extensión para guardar los PIN cifrados (nunca en texto plano)
create extension if not exists pgcrypto with schema extensions;

-- 2. PIN de cada ruta (privado: nadie lo puede leer desde la app)
create table if not exists public.pines (
  ruta_id  int primary key check (ruta_id between 1 and 7),
  pin_hash text not null
);
alter table public.pines enable row level security;
-- Sin políticas = nadie desde la app puede leer ni escribir esta tabla.

-- 3. Ubicación en vivo de cada bus (una fila por ruta)
create table if not exists public.viajes_activos (
  ruta_id        int primary key check (ruta_id between 1 and 7),
  lat            double precision not null,
  lng            double precision not null,
  cupo_completo  boolean not null default false,
  actualizado    timestamptz not null default now()
);
alter table public.viajes_activos enable row level security;

-- Cualquiera puede VER la ubicación; nadie puede escribir directo
drop policy if exists "lectura publica" on public.viajes_activos;
create policy "lectura publica" on public.viajes_activos
  for select using (true);

-- 4. Función para transmitir: valida el PIN antes de guardar
create or replace function public.transmitir(
  p_ruta int, p_pin text, p_lat double precision, p_lng double precision, p_cupo boolean default false
) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from pines where ruta_id = p_ruta and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception 'PIN incorrecto';
  end if;
  -- Solo se aceptan coordenadas dentro de Antioquia (evita ubicaciones falsas lejanas)
  if p_lat not between 5.5 and 7.0 or p_lng not between -76.2 and -75.0 then
    raise exception 'Ubicación fuera del área';
  end if;
  insert into viajes_activos (ruta_id, lat, lng, cupo_completo, actualizado)
  values (p_ruta, p_lat, p_lng, p_cupo, now())
  on conflict (ruta_id) do update
    set lat = excluded.lat, lng = excluded.lng,
        cupo_completo = excluded.cupo_completo, actualizado = now();
end $$;

-- 5. Función para terminar el viaje (el bus desaparece del mapa)
create or replace function public.finalizar(p_ruta int, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from pines where ruta_id = p_ruta and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception 'PIN incorrecto';
  end if;
  delete from viajes_activos where ruta_id = p_ruta;
end $$;

-- 6. Función para validar el PIN al iniciar (sin enviar ubicación)
create or replace function public.validar_pin(p_ruta int, p_pin text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from pines where ruta_id = p_ruta and pin_hash = crypt(p_pin, pin_hash));
$$;

grant execute on function public.transmitir, public.finalizar, public.validar_pin to anon;

-- 7. Activar tiempo real en la tabla de ubicaciones
do $$ begin
  alter publication supabase_realtime add table public.viajes_activos;
exception when duplicate_object then null; end $$;
