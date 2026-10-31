// Colores por ruta (id → color)
const COLORES = { 1: "#e11d48", 2: "#16a34a", 3: "#2563eb", 4: "#ea580c", 5: "#7c3aed", 6: "#0d9488", 7: "#ca8a04" };
const DIAS = { "L-V": "Lunes a viernes", "S": "Sábados" };
const ICONO_BUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a2 2 0 0 1-1 1.73V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1.27A2 2 0 0 1 4 16Zm2-8v4h12V8H6Zm1.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>';
const ICONO_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';

const map = L.map("map", { zoomControl: false }).setView([6.2, -75.55], 12);
L.control.zoom({ position: "topright" }).addTo(map);

// Mapa base de OpenStreetMap (gratis, sin llave). En modo oscuro se oscurece con CSS
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let datos, rutaActual, capas = {}, marcadores = L.layerGroup().addTo(map);
let vivos = {}, buses = {}; // ruta_id → fila de viajes_activos / marcador del bus

fetch("rutas.json")
  .then((r) => r.json())
  .then((d) => {
    datos = d;
    L.marker(d.coord_destino, { icon: icono('<div class="mk-eia">EIA</div>', [34, 21]), zIndexOffset: 1000 })
      .addTo(map).bindPopup(d.destino);
    d.rutas.forEach((ruta) => {
      capas[ruta.id] = L.polyline(ruta.recorrido, { color: COLORES[ruta.id], weight: 3, opacity: 0.35 })
        .addTo(map)
        .on("click", () => seleccionar(ruta.id));
      crearChip(ruta);
    });
    const guardada = Number(leer("ruta")) || 1;
    seleccionar(d.rutas.some((r) => r.id === guardada) ? guardada : 1);
    iniciarTiempoReal();
  });

function crearChip(ruta) {
  const b = document.createElement("button");
  b.className = "chip";
  b.dataset.id = ruta.id;
  b.style.setProperty("--c", COLORES[ruta.id]);
  b.innerHTML = `<span class="num">${ruta.id}</span>${nombreCorto(ruta.nombre)}<span class="live"></span>`;
  b.onclick = () => seleccionar(ruta.id);
  document.getElementById("chips").appendChild(b);
}

function seleccionar(id) {
  const ruta = datos.rutas.find((r) => r.id === id);
  const color = COLORES[id];
  rutaActual = id;
  guardar("ruta", id);
  document.documentElement.style.setProperty("--c", color);

  // Resaltar la ruta elegida y atenuar las demás
  Object.entries(capas).forEach(([rid, capa]) => {
    const activa = Number(rid) === id;
    capa.setStyle({ weight: activa ? 5 : 2.5, opacity: activa ? 0.95 : 0.18 });
    if (activa) capa.bringToFront();
  });

  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", Number(c.dataset.id) === id));
  document.querySelector(`.chip[data-id="${id}"]`).scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });

  // Marcadores: salida + paraderos (solo Rionegro tiene)
  marcadores.clearLayers();
  L.marker(ruta.coord_salida, { icon: icono('<div class="mk-salida"></div>', [22, 22]) })
    .addTo(marcadores).bindPopup("Salida: " + ruta.punto_salida);
  (ruta.paraderos || []).forEach((p, i) =>
    L.marker(p.coord, { icon: icono(`<div class="mk-parada">${i + 1}</div>`, [20, 20]) })
      .addTo(marcadores).bindPopup(nombreParada(p.nombre))
  );

  pintarInfo(ruta);
  pintarBuses();
  // El panel de info cambia el alto del mapa: recalcular antes de encuadrar
  map.invalidateSize();
  map.fitBounds(capas[id].getBounds(), { padding: [30, 30] });
}

function pintarInfo(ruta) {
  const hoy = diaHoy();
  const ahora = minutosAhora();
  const prox = proximaSalida(ruta, hoy, ahora);

  const horarios = ruta.horarios.map((h) => `
    <div class="label">${DIAS[h.dias]}</div>
    <div class="horas">${h.horas.map((t) => {
      const clase = h.dias !== hoy ? "" : aMinutos(t) < ahora ? "pasada" : prox && prox.hora === t ? "siguiente" : "";
      return `<span class="hora ${clase}">${formato12(t)}</span>`;
    }).join("")}</div>`).join("");

  const paradas = ruta.para_donde_pidan ? "" : `
    <div class="label">Paraderos</div>
    <ol class="paradas">${ruta.paraderos.map((p) => `<li>${nombreParada(p.nombre)}</li>`).join("")}</ol>`;

  document.getElementById("info").innerHTML = `
    <div class="sheet-head">
      <div>
        <h2>${ruta.nombre}</h2>
        <p class="origen">${ICONO_PIN}<span>${ruta.punto_salida}</span></p>
      </div>
      <span class="badge">${ruta.para_donde_pidan ? "Parada a solicitud" : "Paraderos fijos"}</span>
    </div>
    <div id="estado"></div>
    <div class="next">
      <div>
        <small>Próxima salida</small>
        <strong>${prox ? formato12(prox.hora) : "Sin más salidas hoy"}</strong>
      </div>
      ${prox ? `<span class="falta">en ${textoFalta(prox.falta)}</span>` : ""}
    </div>
    ${horarios}
    ${paradas}`;
  pintarEstado();
}

// ---------- Tiempo real ----------
async function iniciarTiempoReal() {
  await recargarVivos();
  sb.channel("viajes")
    .on("postgres_changes", { event: "*", schema: "public", table: "viajes_activos" }, (cambio) => {
      if (cambio.eventType === "DELETE") delete vivos[cambio.old.ruta_id];
      else vivos[cambio.new.ruta_id] = cambio.new;
      pintarBuses();
      pintarEstado();
    })
    .subscribe((estado) => { if (estado === "SUBSCRIBED") recargarVivos(); });

  // Refrescar el "hace X s" y ocultar buses sin señal
  setInterval(() => { pintarBuses(); pintarEstado(); }, 10000);
  // Al volver a la app (el celular pudo pausar la conexión), recargar todo
  document.addEventListener("visibilitychange", () => { if (!document.hidden) recargarVivos(); });
}

async function recargarVivos() {
  const { data, error } = await sb.from("viajes_activos").select("*");
  if (error) return console.error(error);
  vivos = Object.fromEntries(data.map((v) => [v.ruta_id, v]));
  pintarBuses();
  pintarEstado();
}

function vigente(v) {
  return v && Date.now() - new Date(v.actualizado).getTime() < VIGENCIA_MS;
}
function sinSenal(v) {
  return Date.now() - new Date(v.actualizado).getTime() > SIN_SENAL_MS;
}

function pintarBuses() {
  if (!datos) return;
  datos.rutas.forEach(({ id }) => {
    const v = vivos[id];
    const activo = vigente(v);
    document.querySelector(`.chip[data-id="${id}"]`).classList.toggle("en-vivo", activo);
    if (!activo) {
      if (buses[id]) { buses[id].remove(); delete buses[id]; }
      return;
    }
    const clase = `mk-bus${v.cupo_completo ? " lleno" : ""}${sinSenal(v) ? " sin-senal" : ""}${id !== rutaActual ? " otra" : ""}`;
    const html = `<div class="${clase}" style="--c:${COLORES[id]}">${ICONO_BUS}</div>`;
    if (!buses[id]) {
      buses[id] = L.marker([v.lat, v.lng], { icon: icono(html, [34, 34]) })
        .addTo(map).on("click", () => seleccionar(id));
    } else {
      buses[id].setLatLng([v.lat, v.lng]).setIcon(icono(html, [34, 34]));
    }
    buses[id].setZIndexOffset(id === rutaActual ? 2000 : 1500);
  });
}

function pintarEstado() {
  const caja = document.getElementById("estado");
  if (!caja) return;
  const v = vivos[rutaActual];
  if (!vigente(v)) {
    caja.innerHTML = `<div class="estado off"><span class="pulso"></span>
      <div class="txt"><b>Sin transmisión</b><span>Nadie está compartiendo la ubicación de este bus</span></div></div>`;
    return;
  }
  const hace = textoHace(v.actualizado);
  if (sinSenal(v)) {
    caja.innerHTML = `<div class="estado off"><span class="pulso"></span>
      <div class="txt"><b>Sin señal reciente${v.cupo_completo ? " · Cupo completo" : ""}</b><span>Última ubicación ${hace}</span></div>
      <button onclick="verBus()">Ver</button></div>`;
    return;
  }
  caja.innerHTML = v.cupo_completo
    ? `<div class="estado lleno"><span class="pulso"></span>
        <div class="txt"><b>Cupo completo</b><span>No hará más paradas · ${hace}</span></div>
        <button onclick="verBus()">Ver bus</button></div>`
    : `<div class="estado"><span class="pulso"></span>
        <div class="txt"><b>En camino</b><span>Ubicación ${hace}</span></div>
        <button onclick="verBus()">Ver bus</button></div>`;
}

function verBus() {
  const v = vivos[rutaActual];
  if (v) map.setView([v.lat, v.lng], 16);
}

function textoHace(fecha) {
  const s = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 1000));
  return s < 15 ? "hace un momento" : s < 60 ? `hace ${s} s` : `hace ${Math.floor(s / 60)} min`;
}

// ---------- Utilidades de hora (Colombia, UTC-5) ----------
function fechaCol() {
  const d = new Date();
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 5 * 3600000);
}
function diaHoy() {
  const dia = fechaCol().getDay(); // 0 domingo … 6 sábado
  return dia === 0 ? null : dia === 6 ? "S" : "L-V";
}
function minutosAhora() {
  const d = fechaCol();
  return d.getHours() * 60 + d.getMinutes();
}
function aMinutos(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function formato12(t) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}
function proximaSalida(ruta, hoy, ahora) {
  const h = ruta.horarios.find((x) => x.dias === hoy);
  const t = h && h.horas.find((x) => aMinutos(x) >= ahora);
  return t ? { hora: t, falta: aMinutos(t) - ahora } : null;
}
function textoFalta(min) {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

// ---------- Otros ----------
function nombreCorto(n) {
  return n.replace(/^Ruta\s+/i, "").replace(" (unificada)", "").replace("Sofasa - Aguacatala - Bosques de Zúñiga", "Sofasa - Zúñiga");
}
function nombreParada(n) {
  return n.replace(/^Parad(a|ero)\s+\d+\s+/i, "");
}
function icono(html, size) {
  return L.divIcon({ html, className: "", iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
}
function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
