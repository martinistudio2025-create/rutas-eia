# Rutas EIA

Aplicación web para ver en tiempo real dónde van los buses de las rutas de la Universidad EIA (campus Las Palmas).

## Funcionalidades

- **Mapa en vivo**: muestra el recorrido de las 7 rutas y la ubicación actual del bus.
- **Transmisión con PIN**: un estudiante a bordo comparte el GPS de su celular desde `transmitir.html`.
- **Cupo completo**: avisa que el bus ya no hará más paradas.
- **Horarios**: próxima salida de cada ruta según la hora de Colombia.

## Tecnología

| Pieza | Herramienta |
|---|---|
| Página | HTML, CSS y JavaScript (sin frameworks) |
| Mapa | Leaflet + CARTO / OpenStreetMap |
| Tiempo real | Supabase |
| Hosting | Netlify |

## Estructura

| Archivo | Descripción |
|---|---|
| `index.html`, `app.js`, `styles.css` | Mapa para los pasajeros |
| `transmitir.html`, `transmitir.js`, `transmitir.css` | Pantalla del transmisor |
| `registro.html`, `registro.js`, `registro.css` | Registro único sin contraseña (lista de carreras en `registro.js`) |
| `admin.html`, `admin.js`, `admin.css` | Panel de administración (requiere usuario en Supabase Auth y estar en la tabla `admins`) |
| `img/` | Logos e íconos de la marca tracker. x EIA |
| `config.js` | Conexión a Supabase (llave pública) |
| `rutas.json` | Rutas, horarios y recorridos |
| `supabase/usuarios.sql` | Tabla y función del registro de usuarios |
| `supabase/admin.sql` | Lista de administradores y permiso de lectura de usuarios |
| `supabase/schema.sql` | Tablas, seguridad y funciones de la base de datos |
| `supabase/pines.sql` | Plantilla para definir los PIN (no subir PIN reales) |
| `kml/` | Recorridos originales exportados de Google My Maps |
