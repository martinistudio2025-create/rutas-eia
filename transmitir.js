// Pantalla del transmisor: valida el PIN, envía el GPS cada pocos segundos
// y permite marcar cupo completo o finalizar el viaje.
const $ = (id) => document.getElementById(id);

let sesion = null;   // { ruta, nombre, pin, cupo, traccar }
let posicion = null; // última lectura del GPS
let watchId = null, timer = null, wakeLock = null, enviando = false;

// Cargar las rutas en el selector
fetch("rutas.json").then((r) => r.json()).then((d) => {
  $("ruta").innerHTML = d.rutas.map((r) => `<option value="${r.id}">${r.id}. ${r.nombre.replace(/^Ruta\s+/i, "")}</option>`).join("");
  const guardada = leer(localStorage, "ruta");
  if (guardada) $("ruta").value = guardada;

  // Si se recargó la página en medio de un viaje, retomarlo
  const previa = JSON.parse(leer(sessionStorage, "sesion") || "null");
  if (previa) arrancar(previa);
});

$("form").addEventListener("submit", (e) => { e.preventDefault(); entrar(false); });
$("btn-avisos").addEventListener("click", () => {
  if ($("form").reportValidity()) entrar(true);
});

// traccar = true: la ubicación la envía Traccar Client; esta pantalla solo marca cupo y finaliza
async function entrar(traccar) {
  const ruta = Number($("ruta").value);
  const pin = $("pin").value.trim();
  mostrarError("");
  $("btn-iniciar").disabled = true;
  $("btn-iniciar").textContent = "Verificando…";

  const { data: ok, error } = await sb.rpc("validar_pin", { p_ruta: ruta, p_pin: pin });
  $("btn-iniciar").disabled = false;
  $("btn-iniciar").textContent = "Iniciar transmisión";
  if (error) return mostrarError("No hay conexión. Revisa tu internet e intenta de nuevo.");
  if (!ok) return mostrarError("PIN incorrecto para esta ruta.");

  guardar(localStorage, "ruta", ruta);
  arrancar({ ruta, nombre: $("ruta").selectedOptions[0].textContent, pin, cupo: false, traccar });
}

function arrancar(s) {
  sesion = s;
  guardar(sessionStorage, "sesion", JSON.stringify(sesion));
  $("paso-inicio").hidden = true;
  $("paso-activo").hidden = false;
  $("titulo-ruta").textContent = sesion.nombre;
  pintarCupo();
  $("datos").hidden = !!sesion.traccar;

  if (sesion.traccar) {
    estado("ok", "Modo Traccar: la ubicación la envía la app Traccar");
    $("aviso").hidden = false;
    $("aviso").textContent = "Puedes bloquear el celular. Vuelve aquí solo para marcar cupo completo o finalizar.";
    return;
  }
  if (!("geolocation" in navigator)) return estado("error", "Este celular no permite compartir ubicación");
  estado("esperando", "Obteniendo ubicación…");
  watchId = navigator.geolocation.watchPosition(
    (p) => {
      const primera = !posicion;
      posicion = p.coords;
      $("precision").textContent = `± ${Math.round(posicion.accuracy)} m`;
      if (primera) enviar();
    },
    (err) => estado("error", err.code === 1
      ? "Permiso de ubicación denegado. Actívalo en los ajustes del navegador."
      : "No se pudo obtener la ubicación. Revisa que el GPS esté activo."),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
  timer = setInterval(enviar, INTERVALO_ENVIO_MS);
  mantenerPantalla();
}

async function enviar() {
  if (!sesion || !posicion || enviando) return;
  enviando = true;
  const { error } = await sb.rpc("transmitir", {
    p_ruta: sesion.ruta, p_pin: sesion.pin,
    p_lat: posicion.latitude, p_lng: posicion.longitude, p_cupo: sesion.cupo,
  });
  enviando = false;
  if (error) {
    if (/PIN/.test(error.message)) { alert("El PIN de esta ruta cambió. Ingrésalo de nuevo."); return detener(); }
    return estado("error", /área/.test(error.message) ? "Tu ubicación está fuera del área de las rutas" : "Sin conexión, reintentando…");
  }
  estado("ok", "Transmitiendo en vivo");
  $("ultimo").textContent = new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

$("btn-cupo").addEventListener("click", async () => {
  sesion.cupo = !sesion.cupo;
  guardar(sessionStorage, "sesion", JSON.stringify(sesion));
  pintarCupo();
  if (!sesion.traccar) return enviar();

  const { data: ok, error } = await sb.rpc("marcar_cupo", { p_ruta: sesion.ruta, p_pin: sesion.pin, p_cupo: sesion.cupo });
  if (error || !ok) {
    sesion.cupo = !sesion.cupo; // revertir: no se pudo marcar
    guardar(sessionStorage, "sesion", JSON.stringify(sesion));
    pintarCupo();
    alert(error ? "Sin conexión. Intenta de nuevo." : "Traccar todavía no ha enviado la ubicación de este bus. Revisa que esté activo.");
  }
});

$("btn-fin").addEventListener("click", async () => {
  if (!confirm("¿Finalizar el viaje? El bus dejará de verse en el mapa.")) return;
  $("btn-fin").disabled = true;
  await sb.rpc("finalizar", { p_ruta: sesion.ruta, p_pin: sesion.pin });
  $("btn-fin").disabled = false;
  if (sesion.traccar) alert("Recuerda apagar el servicio en Traccar Client; si no, el bus vuelve a aparecer en el mapa.");
  detener();
});

function detener() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  clearInterval(timer);
  if (wakeLock) wakeLock.release();
  watchId = timer = wakeLock = sesion = posicion = null;
  try { sessionStorage.removeItem("sesion"); } catch (e) {}
  $("pin").value = "";
  $("ultimo").textContent = $("precision").textContent = "—";
  $("paso-activo").hidden = true;
  $("paso-inicio").hidden = false;
}

function pintarCupo() {
  const on = sesion.cupo;
  $("btn-cupo").classList.toggle("on", on);
  $("btn-cupo").querySelector("b").textContent = on ? "Cupo completo activado" : "Marcar cupo completo";
  $("btn-cupo").querySelector("span").textContent = on
    ? "Toca de nuevo si se liberan cupos"
    : "Avisa que el bus ya no hará más paradas";
}

function estado(tipo, texto) {
  const card = document.querySelector(".live-card");
  card.classList.toggle("esperando", tipo === "esperando");
  card.classList.toggle("error", tipo === "error");
  $("estado-tx").textContent = texto;
}

// Evita que la pantalla se apague (si se apaga, el navegador pausa el GPS)
async function mantenerPantalla() {
  const aviso = $("aviso");
  if (!("wakeLock" in navigator)) {
    aviso.hidden = false;
    aviso.textContent = "Tu navegador no puede mantener la pantalla encendida. No bloquees el celular durante el viaje.";
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    aviso.hidden = true;
  } catch (e) {
    aviso.hidden = false;
    aviso.textContent = "No bloquees el celular: si la pantalla se apaga, la transmisión se pausa.";
  }
}
// Al volver a la pestaña, el bloqueo de pantalla se pierde: pedirlo otra vez y enviar ya
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && sesion && !sesion.traccar) { mantenerPantalla(); enviar(); }
});

function mostrarError(t) { $("error").hidden = !t; $("error").textContent = t; }
function guardar(st, k, v) { try { st.setItem(k, v); } catch (e) {} }
function leer(st, k) { try { return st.getItem(k); } catch (e) { return null; } }
