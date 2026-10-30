-- =========================================================
-- Definir o cambiar los PIN de las rutas
-- 1. Reemplaza cada 'CAMBIAR' por el PIN real (ej. '4821')
-- 2. Pega en SQL Editor > Run
-- 3. NO guardes este archivo con los PIN reales en GitHub
-- =========================================================
insert into public.pines (ruta_id, pin_hash) values
  (1, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (2, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (3, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (4, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (5, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (6, extensions.crypt('CAMBIAR', extensions.gen_salt('bf'))),
  (7, extensions.crypt('CAMBIAR', extensions.gen_salt('bf')))
on conflict (ruta_id) do update set pin_hash = excluded.pin_hash;
