// Registro sin contraseña: se hace una vez y queda guardado en el celular
const $ = (id) => document.getElementById(id);

// Editar aquí la lista de carreras
const CARRERAS = [
  "Ingeniería Administrativa",
  "Ingeniería Ambiental",
  "Ingeniería Biomédica",
  "Ingeniería Civil",
  "Ingeniería de Sistemas y Computación",
  "Ingeniería Financiera",
  "Ingeniería Geológica",
  "Ingeniería Industrial",
  "Ingeniería Mecatrónica",
  "Física",
  "Medicina",
];
const OTRA = "Otra / Posgrado";

let rol = "Estudiante";

// Si ya está registrado, no tiene nada que hacer aquí
try { if (localStorage.getItem("usuario")) location.replace("./"); } catch (e) {}

$("carrera").innerHTML = `<option value="" disabled selected>Selecciona tu carrera</option>`
  + [...CARRERAS, OTRA].map((c) => `<option>${c}</option>`).join("");

fetch("rutas.json").then((r) => r.json()).then((d) => {
  $("ruta").innerHTML += d.rutas.map((r) => `<option value="${r.id}">${r.id}. ${r.nombre.replace(/^Ruta\s+/i, "")}</option>`).join("");
});

// Rol: estudiantes eligen carrera; docentes y administrativos escriben su área
$("rol").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  rol = b.dataset.v;
  document.querySelectorAll("#rol button").forEach((x) => x.classList.toggle("on", x === b));
  const estudiante = rol === "Estudiante";
  $("campo-carrera").hidden = !estudiante;
  $("label-otra").textContent = estudiante ? "¿Cuál?" : "Área o dependencia";
  $("otra").placeholder = estudiante ? "Escribe tu carrera" : "Ej. Bienestar Universitario";
  mostrarOtra();
});
$("carrera").addEventListener("change", mostrarOtra);
function mostrarOtra() {
  $("campo-otra").hidden = rol === "Estudiante" && $("carrera").value !== OTRA;
}

$("correo").addEventListener("input", () => $("correo").classList.remove("mal"));

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = $("nombre").value.trim();
  const correo = $("correo").value.trim().toLowerCase();
  const carrera = rol === "Estudiante" && $("carrera").value !== OTRA ? $("carrera").value : $("otra").value.trim();
  const ruta = $("ruta").value ? Number($("ruta").value) : null;

  if (nombre.length < 3) return error("Escribe tu nombre completo.");
  if (!/^[a-z0-9._%+-]+@eia\.edu\.co$/.test(correo)) {
    $("correo").classList.add("mal");
    return error("Usa tu correo institucional (termina en @eia.edu.co).");
  }
  if (carrera.length < 2) return error(rol === "Estudiante" ? "Selecciona o escribe tu carrera." : "Escribe tu área o dependencia.");
  if (!$("acepta").checked) return error("Debes autorizar el tratamiento de datos para continuar.");

  error("");
  $("btn").disabled = true;
  $("btn").textContent = "Registrando…";
  const { error: err } = await sb.rpc("registrar_usuario", {
    p_correo: correo, p_nombre: nombre, p_rol: rol, p_carrera: carrera, p_ruta: ruta, p_acepta: true,
  });
  $("btn").disabled = false;
  $("btn").textContent = "Entrar";
  if (err) return error("No pudimos registrarte. Revisa tu conexión e intenta de nuevo.");

  try {
    localStorage.setItem("usuario", JSON.stringify({ nombre, correo, rol, carrera, ruta }));
    if (ruta) localStorage.setItem("ruta", ruta); // el mapa abre directo en su ruta
  } catch (e) {}
  location.replace("./");
});

function error(t) { $("error").hidden = !t; $("error").textContent = t; }
