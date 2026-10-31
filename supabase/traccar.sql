-- =========================================================
-- Funciones para transmitir con Traccar Client
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- =========================================================

-- Guarda solo la ubicación (no toca el aviso de cupo completo).
-- Si el bus llevaba más de 30 min sin señal, es un viaje nuevo: el cupo vuelve a "disponible".
create or replace function public.transmitir_gps(
  p_ruta int, p_pin text, p_lat double precision, p_lng double precision
) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from pines where ruta_id = p_ruta and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception 'PIN incorrecto';
  end if;
  if p_lat not between 5.5 and 7.0 or p_lng not between -76.2 and -75.0 then
    raise exception 'Ubicación fuera del área';
  end if;
  insert into viajes_activos (ruta_id, lat, lng, cupo_completo, actualizado)
  values (p_ruta, p_lat, p_lng, false, now())
  on conflict (ruta_id) do update
    set lat = excluded.lat, lng = excluded.lng, actualizado = now(),
        cupo_completo = case when viajes_activos.actualizado < now() - interval '30 minutes'
                             then false else viajes_activos.cupo_completo end;
end $$;

-- Marca o quita el cupo completo sin enviar ubicación (modo "solo avisos" de la web)
create or replace function public.marcar_cupo(p_ruta int, p_pin text, p_cupo boolean) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from pines where ruta_id = p_ruta and pin_hash = crypt(p_pin, pin_hash)) then
    raise exception 'PIN incorrecto';
  end if;
  update viajes_activos set cupo_completo = p_cupo where ruta_id = p_ruta;
  return found; -- false si el bus todavía no está transmitiendo
end $$;

grant execute on function public.transmitir_gps(int, text, double precision, double precision) to anon;
grant execute on function public.marcar_cupo(int, text, boolean) to anon;

notify pgrst, 'reload schema';
