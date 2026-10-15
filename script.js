/* Collage (Quiénes somos): movimiento sutil de los recortes (flotan, siguen el mouse y se apartan un poco del cursor).
   Para hacerlo más o menos notorio, ajusta las constantes de abajo. */
(function () {
  const hero = document.querySelector(".image-hero");
  const collage = hero && hero.querySelector(".hero-collage");
  if (!collage || location.hash === "#editar") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const PARALLAX = 8; // px máximos que se desplaza con el mouse (en la capa más alta)
  const FLOAT = 2; // px de flotación constante
  const TILT = 0.6; // grados de balanceo constante
  const REPEL_RADIUS = 220; // px alrededor del cursor que empujan
  const REPEL_FORCE = 0.35; // fuerza del empujón
  const SPRING = 0.04; // vuelta a su lugar
  const DAMPING = 0.88; // freno
  const FPS = 12; // cuadros por segundo visibles: bajo = más "stop-motion" de recortes

  const imgs = [...collage.querySelectorAll("img")];
  const maxZ = Math.max(...imgs.map((el) => parseFloat(el.style.getPropertyValue("--z")) || 1));
  const objects = imgs.map((el, i) => ({
    el,
    depth: (parseFloat(el.style.getPropertyValue("--z")) || 1) / maxZ, // 0–1: capas altas se mueven más
    ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, vr: 0,
    phase: i * 1.7,
  }));

  let pointer = null;
  window.addEventListener("pointermove", (e) => (pointer = { x: e.clientX, y: e.clientY }));
  document.addEventListener("pointerleave", () => (pointer = null));
  window.addEventListener("blur", () => (pointer = null));

  let running = false;
  let rafId = 0;
  let lastDraw = 0;

  function frame(now) {
    const t = now / 1000;
    // La física corre a velocidad normal; solo se dibuja FPS veces por segundo
    const interval = 1000 / FPS;
    const draw = now - lastDraw >= interval;
    // Avanza en pasos fijos para mantener FPS exactos en pantallas de 60, 120, 144 Hz…
    if (draw) lastDraw = now - lastDraw > interval * 2 ? now : lastDraw + interval;
    const nx = pointer ? (pointer.x / window.innerWidth) * 2 - 1 : 0;
    const ny = pointer ? (pointer.y / window.innerHeight) * 2 - 1 : 0;

    for (const o of objects) {
      const fx = Math.sin(t * 0.5 + o.phase) * FLOAT;
      const fy = Math.cos(t * 0.7 + o.phase) * FLOAT;
      const fr = Math.sin(t * 0.4 + o.phase) * TILT;
      const tx = -nx * PARALLAX * o.depth;
      const ty = -ny * PARALLAX * 0.5 * o.depth;

      if (pointer) {
        const r = o.el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - pointer.x;
        const dy = r.top + r.height / 2 - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        const radius = REPEL_RADIUS + r.width * 0.3;
        if (dist < radius) {
          const force = (1 - dist / radius) * REPEL_FORCE;
          o.vx += (dx / dist) * force;
          o.vy += (dy / dist) * force;
          o.vr += (dx > 0 ? 1 : -1) * force * 0.15;
        }
      }

      o.vx = (o.vx + (tx - o.ox) * SPRING) * DAMPING;
      o.vy = (o.vy + (ty - o.oy) * SPRING) * DAMPING;
      o.vr = (o.vr - o.rot * SPRING) * DAMPING;
      o.ox += o.vx;
      o.oy += o.vy;
      o.rot += o.vr;

      if (!draw) continue;
      o.el.style.setProperty("--mx", (o.ox + fx).toFixed(2) + "px");
      o.el.style.setProperty("--my", (o.oy + fy).toFixed(2) + "px");
      o.el.style.setProperty("--mr", (o.rot + fr).toFixed(2) + "deg");
    }
    rafId = requestAnimationFrame(frame);
  }

  // Solo anima mientras el hero está en pantalla
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      rafId = requestAnimationFrame(frame);
    } else if (!entry.isIntersecting && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }).observe(hero);
})();

/* Cartelera: filtra los eventos por disciplina (data-filtro del botón = data-disciplina del evento)
   y por precio máximo (select [data-filtro-precio] contra data-precio del evento; 0 = gratis).
   Puede haber varias listas [data-cartelera] (p. ej. una por mes): si una queda vacía,
   se oculta su grupo [data-grupo] completo */
(function () {
  const filtros = document.querySelector("#cartelera .filtros");
  const listas = document.querySelectorAll("[data-cartelera]");
  if (!filtros || !listas.length) return;
  const vacia = document.querySelector("[data-cartelera-vacia]");
  const precio = document.querySelector("[data-filtro-precio]");
  let disciplina = "todo";

  const aplicar = () => {
    const tope = precio && precio.value !== "" ? Number(precio.value) : Infinity;
    let total = 0;
    for (const lista of listas) {
      let visibles = 0;
      for (const ev of lista.children) {
        const ver =
          (disciplina === "todo" || ev.dataset.disciplina === disciplina) &&
          Number(ev.dataset.precio || 0) <= tope;
        ev.hidden = !ver;
        if (ver) visibles++;
      }
      const grupo = lista.closest("[data-grupo]");
      if (grupo) grupo.hidden = visibles === 0;
      total += visibles;
    }
    if (vacia) vacia.hidden = total > 0;
  };

  filtros.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filtro]");
    if (!btn) return;
    for (const b of filtros.querySelectorAll("button")) {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    }
    disciplina = btn.dataset.filtro;
    aplicar();
  });
  if (precio) precio.addEventListener("change", aplicar);
})();

/* Íconos de las entradas: a cada uno le toca al azar una forma y un color de la marca,
   sin repetir la forma ni el color del ícono anterior */
(function () {
  const iconos = ["asterisco", "flecha", "flecha-2", "punto"]; // archivos en iconos-anomala/
  const colores = ["--brand", "--ui-highlight", "--ui-success", "--ui-info"];
  const azar = (lista, evitar) => {
    const opciones = lista.filter((x) => x !== evitar);
    return opciones[Math.floor(Math.random() * opciones.length)];
  };

  let icono, color;
  for (const el of document.querySelectorAll(".anomala-icon")) {
    icono = azar(iconos, icono);
    color = azar(colores, color);
    el.style.setProperty("--icono", `url("iconos-anomala/${icono}.webp")`);
    el.style.setProperty("--icono-color", `var(${color})`);
  }
})();

/* Panel Hazte Anómala: los botones de plan quedan deshabilitados hasta aceptar los términos */
(function () {
  const acepto = document.querySelector("#hazte-anomala [data-terminos]");
  if (!acepto) return;
  const botones = document.querySelectorAll("#hazte-anomala [data-requiere-terminos]");
  const actualizar = () => {
    for (const b of botones) {
      b.classList.toggle("pe-none", !acepto.checked);
      b.classList.toggle("opacity-50", !acepto.checked);
      b.setAttribute("aria-disabled", !acepto.checked);
      b.tabIndex = acepto.checked ? 0 : -1;
    }
  };
  acepto.addEventListener("change", actualizar);
  actualizar();
})();

/* Montos del aporte único (panel Hazte Anómala): marca el monto elegido y limpia "Otro monto" */
(function () {
  const montos = document.querySelector("#hazte-anomala .filtros");
  if (!montos) return;
  const otro = document.querySelector("#aporte-otro");
  montos.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    for (const b of montos.querySelectorAll("button")) {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    }
    if (otro) otro.value = "";
  });
})();

/* Aviso de cookies: se muestra mientras no haya elección guardada; al elegir se oculta y se recuerda.
   Por defecto no se carga analítica: solo con "Aceptar" (en WordPress lo resuelve el plugin de consentimiento) */
(function () {
  const aviso = document.querySelector("[data-cookies]");
  if (!aviso) return;
  const CLAVE = "anomala-cookies";
  let eleccion = null;
  try {
    eleccion = localStorage.getItem(CLAVE);
  } catch (e) {}
  if (eleccion) return;
  aviso.hidden = false;
  aviso.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cookies-opcion]");
    if (!btn) return;
    try {
      localStorage.setItem(CLAVE, btn.dataset.cookiesOpcion); // "todas" | "necesarias"
    } catch (e) {}
    aviso.hidden = true;
    // Aquí se cargaría la analítica si btn.dataset.cookiesOpcion === "todas"
  });
})();

/* Contacto: preselecciona el asunto que llega en la URL (p. ej. contacto.html?asunto=donar desde "Donaciones y alianzas") */
(function () {
  const asunto = document.querySelector("#c-asunto");
  const valor = new URLSearchParams(location.search).get("asunto");
  if (!asunto || !valor) return;
  const opcion = [...asunto.options].find((o) => o.value === valor);
  if (opcion) asunto.value = valor;
})();

/* Ingresar: abre la pestaña del hash (#registro, #recuperar), la cambia con los enlaces internos
   y preselecciona el plan que llega en la URL (?plan=conversa / ?plan=encuentro) */
(function () {
  const pestañas = document.querySelectorAll('[data-bs-toggle="pill"]');
  if (!pestañas.length || !window.bootstrap) return;
  const abrir = (id) => {
    const btn = document.querySelector('[data-bs-toggle="pill"][data-bs-target="#' + id + '"]');
    if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  };
  if (location.hash) abrir(location.hash.slice(1));
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-tab]");
    if (!a) return;
    e.preventDefault();
    abrir(a.getAttribute("href").slice(1));
  });
  const plan = new URLSearchParams(location.search).get("plan");
  const select = document.querySelector("#registro-plan");
  if (plan && select && [...select.options].some((o) => o.value === plan)) select.value = plan;
})();
