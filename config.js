// Conexión a Supabase. La llave publishable es pública por diseño:
// la seguridad la ponen las políticas y funciones de supabase/schema.sql
const SUPABASE_URL = "https://rfkylfdktjfbuxywzjjx.supabase.co";
const SUPABASE_KEY = "sb_publishable_rzhRzhfj8DeyW060v8waNw_E9OMPQOo";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Si un bus no envía ubicación en este tiempo, se deja de mostrar
const VIGENCIA_MS = 3 * 60 * 1000;
// Cada cuánto el transmisor envía la ubicación
const INTERVALO_ENVIO_MS = 5000;
