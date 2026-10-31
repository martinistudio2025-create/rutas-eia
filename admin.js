// Panel de administración: inicia sesión con Supabase Auth y lista los usuarios.
// La base de datos solo entrega los datos si el correo está en la tabla admins.
const $ = (id) => document.getElementById(id);
const COLORES = { 1: "#e11d48", 2: "#16a34a", 3: "#2563eb", 4: "#ea580c", 5: "#7c3aed", 6: "#0d9488", 7: "#ca8a04" };

let usuarios = [], rutas = {}, orden = { k: "creado", dir: -1 };

fetch("rutas.json").then((r) => r.json()).then((d) => {
  d.rutas.forEach((r) => (rutas[r.id] = r.nombre.replace(/^Ruta\s+/i, "")));
  $("f-ruta").innerHTML += Object.entries(rutas).map(([id, n]) => `<option value="${id}">${id}. ${n}</option>`).join("")
    + `<option value="0">Sin ruta</option>`;
  iniciar();
});

async function iniciar() {
  const { data } = await sb.auth.getSession();
  data.session ? cargar() : mostrar("login");
}

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  errorLogin("");
  $("btn-entrar").disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("clave").value });
  $("btn-entrar").disabled = false;
  if (error) return errorLogin("Correo o contraseña incorrectos.");
  $("clave").value = "";
  cargar();
});

$("btn-salir").addEventListener("click", async () => {
  await sb.auth.signOut();
  usuarios = [];
  mostrar("login");
});

async function cargar() {
  const { data: admin } = await sb.rpc("es_admin");
  if (!admin) {
    await sb.auth.signOut();
    mostrar("login");
    return errorLogin("Esta cuenta no tiene permisos de administrador.");
  }
  mostrar("panel");
  const { data, error } = await sb.from("usuarios").select("*").order("creado", { ascending: false });
  if (error) return ($("subtitulo").textContent = "No se pudieron cargar los datos: " + error.message);
  usuarios = data;

  const carreras = [...new Set(data.map((u) => u.carrera))].sort((a, b) => a.localeCompare(b, "es"));
  $("f-carrera").innerHTML = `<option value="">Todas las carreras</option>` + carreras.map((c) => `<option>${esc(c)}</option>`).join("");
  pintarKpis();
  pintarTabla();
}

function pintarKpis() {
  const hace7 = Date.now() - 7 * 864e5;
  const porRuta = {};
  usuarios.forEach((u) => u.ruta_habitual && (porRuta[u.ruta_habitual] = (porRuta[u.ruta_habitual] || 0) + 1));
  const top = Object.entries(porRuta).sort((a, b) => b[1] - a[1])[0];

  $("k-total").textContent = usuarios.length;
  $("k-est").textContent = usuarios.filter((u) => u.rol === "Estudiante").length;
  $("k-semana").textContent = usuarios.filter((u) => new Date(u.creado) > hace7).length;
  $("k-ruta").textContent = top ? `${top[0]}. ${rutas[top[0]]} (${top[1]})` : "—";
  $("k-ruta").title = $("k-ruta").textContent;
  $("subtitulo").textContent = `Actualizado ${new Date().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`;
}

function filtrados() {
  const q = $("buscar").value.trim().toLowerCase();
  const r = $("f-ruta").value, c = $("f-carrera").value;
  return usuarios
    .filter((u) => !q || u.nombre.toLowerCase().includes(q) || u.correo.includes(q))
    .filter((u) => r === "" || String(u.ruta_habitual || 0) === r)
    .filter((u) => !c || u.carrera === c)
    .sort((a, b) => {
      const va = valor(a, orden.k), vb = valor(b, orden.k);
      return (va > vb ? 1 : va < vb ? -1 : 0) * orden.dir;
    });
}
function valor(u, k) {
  if (k === "ruta") return u.ruta_habitual || 99;
  if (k === "creado") return u.creado;
  return (u[k] || "").toLowerCase();
}

function pintarTabla() {
  const lista = filtrados();
  $("filas").innerHTML = lista.map((u) => `
    <tr>
      <td>${esc(u.nombre)}</td>
      <td>${esc(u.correo)}</td>
      <td>${esc(u.carrera)}${u.rol !== "Estudiante" ? ` <span class="sin">(${u.rol})</span>` : ""}</td>
      ${u.ruta_habitual
        ? `<td><span class="num" style="background:${COLORES[u.ruta_habitual]}">${u.ruta_habitual}</span>${esc(rutas[u.ruta_habitual])}</td>`
        : `<td class="sin">Sin ruta</td>`}
      <td>${new Date(u.creado).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</td>
    </tr>`).join("");
  $("vacio").hidden = lista.length > 0;
  document.querySelectorAll("th").forEach((th) => {
    th.classList.toggle("asc", th.dataset.k === orden.k && orden.dir === 1);
    th.classList.toggle("desc", th.dataset.k === orden.k && orden.dir === -1);
  });
}

["buscar", "f-ruta", "f-carrera"].forEach((id) => $(id).addEventListener("input", pintarTabla));
document.querySelectorAll("th").forEach((th) => th.addEventListener("click", () => {
  orden = { k: th.dataset.k, dir: orden.k === th.dataset.k ? -orden.dir : 1 };
  pintarTabla();
}));

// Descargar lo que se ve en pantalla (respeta los filtros), listo para Excel
$("btn-csv").addEventListener("click", () => {
  const campos = ["Nombre", "Correo", "Rol", "Carrera", "Ruta", "Fecha de registro"];
  const filas = filtrados().map((u) => [u.nombre, u.correo, u.rol, u.carrera,
    u.ruta_habitual ? `${u.ruta_habitual}. ${rutas[u.ruta_habitual]}` : "", new Date(u.creado).toLocaleString("es-CO")]);
  const csv = [campos, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `usuarios-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

function mostrar(vista) {
  $("vista-login").hidden = vista !== "login";
  $("vista-panel").hidden = vista !== "panel";
  $("btn-salir").hidden = vista !== "panel";
}
function errorLogin(t) { $("error-login").hidden = !t; $("error-login").textContent = t; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
