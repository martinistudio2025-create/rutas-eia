// Edge Function: recibe la ubicación que envía Traccar Client y la guarda en viajes_activos.
//
// En Traccar Client, el "Identificador del dispositivo" debe ser RUTA-PIN (ej. 3-4821).
// Acepta los dos formatos que usa Traccar Client:
//   - Versiones nuevas: POST con JSON { device_id, location: { coords: { latitude, longitude } } }
//   - Versiones anteriores (protocolo OsmAnd): ?id=3-4821&lat=6.2&lon=-75.5
//
// En Supabase debe desplegarse con "Verify JWT" desactivado: Traccar no envía llaves.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// La llave publishable es pública; la seguridad la pone la función transmitir_gps (valida el PIN)
const API_KEY = "sb_publishable_rzhRzhfj8DeyW060v8waNw_E9OMPQOo";

type Lectura = { id: string; lat: number; lng: number };

function leerLectura(url: URL, cuerpo: string, tipo: string): Lectura | null {
  let id = url.searchParams.get("id") ?? url.searchParams.get("deviceid");
  let lat = url.searchParams.get("lat");
  let lng = url.searchParams.get("lon");

  if (cuerpo && tipo.includes("json")) {
    const json = JSON.parse(cuerpo);
    // Si llegan varias ubicaciones acumuladas (sin señal), se usa la más reciente
    const loc = Array.isArray(json.location) ? json.location.at(-1) : json.location;
    id = json.device_id ?? json.id ?? id;
    lat = loc?.coords?.latitude ?? json.lat ?? lat;
    lng = loc?.coords?.longitude ?? json.lon ?? lng;
  } else if (cuerpo) {
    const form = new URLSearchParams(cuerpo);
    id = form.get("id") ?? id;
    lat = form.get("lat") ?? lat;
    lng = form.get("lon") ?? lng;
  }

  if (!id || lat == null || lng == null) return null;
  return { id: String(id).trim(), lat: Number(lat), lng: Number(lng) };
}

function separarId(id: string): { ruta: number; pin: string } | null {
  const m = id.match(/^(\d+)-(.+)$/);
  return m ? { ruta: Number(m[1]), pin: m[2] } : null;
}

Deno.serve(async (req) => {
  let lectura: Lectura | null;
  try {
    lectura = leerLectura(new URL(req.url), await req.text(), req.headers.get("content-type") ?? "");
  } catch {
    return new Response("Formato no válido", { status: 400 });
  }
  const datos = lectura && separarId(lectura.id);
  if (!lectura || !datos || !Number.isFinite(lectura.lat) || !Number.isFinite(lectura.lng)) {
    return new Response("Faltan datos. El identificador debe ser RUTA-PIN, ej. 3-4821", { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/transmitir_gps`, {
    method: "POST",
    headers: { apikey: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_ruta: datos.ruta, p_pin: datos.pin, p_lat: lectura.lat, p_lng: lectura.lng }),
  });
  if (res.ok) return new Response("OK");

  const error = await res.text();
  const estado = error.includes("PIN") ? 401 : 400;
  return new Response(error, { status: estado });
});
