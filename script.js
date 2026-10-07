/* Hero: movimiento sutil de los recortes (flotan, siguen el mouse y se apartan un poco del cursor).
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

/* Hero: modo edición del collage. Se activa abriendo home-page.html#editar
   - Arrastrar: mueve el recorte (--x / --y)
   - Rueda: cambia el tamaño (--w)        · Shift + rueda: gira (--r)
   - Teclas ↑ ↓: sube o baja de capa (--z) · Flechas con Alt: mueve 0.1 en 0.1
   - "Copiar HTML": copia las líneas <img> para pegarlas en home-page.html */
(function () {
  const collage = document.querySelector(".hero-collage");
  if (!collage || location.hash !== "#editar") return;

  document.body.classList.add("collage-editing");
  const imgs = [...collage.querySelectorAll("img")];
  const round = (n) => Math.round(n * 10) / 10;
  const get = (el, k) => parseFloat(el.style.getPropertyValue("--" + k)) || 0;
  const set = (el, k, v) => el.style.setProperty("--" + k, round(v));
  let selected = null;

  const panel = document.createElement("div");
  panel.className = "collage-panel";
  document.body.append(panel);

  function line(el) {
    const v = (k) => `--${k}: ${get(el, k)}`;
    return `<img src="${el.getAttribute("src")}" alt="" style="${["x", "y", "w", "r", "z"].map(v).join("; ")}" />`;
  }
  function render() {
    panel.innerHTML = selected
      ? `<b>${selected.getAttribute("src").split("/").pop()}</b><br>` +
        ["x", "y", "w", "r", "z"].map((k) => `--${k}: ${get(selected, k)}`).join(" · ")
      : "Haz clic en un recorte para editarlo.";
    const btn = document.createElement("button");
    btn.textContent = "Copiar HTML";
    btn.onclick = () => {
      navigator.clipboard.writeText(imgs.map(line).join("\n"));
      btn.textContent = "¡Copiado!";
    };
    panel.append(document.createElement("br"), btn);
  }
  function select(el) {
    if (selected) selected.classList.remove("is-selected");
    selected = el;
    el.classList.add("is-selected");
    render();
  }

  for (const el of imgs) {
    el.draggable = false;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      select(el);
      const rect = collage.getBoundingClientRect();
      const start = { px: e.clientX, py: e.clientY, x: get(el, "x"), y: get(el, "y") };
      const move = (ev) => {
        set(el, "x", start.x + ((ev.clientX - start.px) / rect.width) * 100);
        set(el, "y", start.y + ((ev.clientY - start.py) / rect.height) * 100);
        render();
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
    el.addEventListener(
      "wheel",
      (e) => {
        if (el !== selected) return;
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        if (e.shiftKey) set(el, "r", get(el, "r") + dir);
        else set(el, "w", Math.max(1, get(el, "w") + dir * 0.5));
        render();
      },
      { passive: false }
    );
  }

  window.addEventListener("keydown", (e) => {
    if (!selected) return;
    const step = 0.1;
    const keys = {
      ArrowUp: () => (e.altKey ? set(selected, "y", get(selected, "y") - step) : set(selected, "z", get(selected, "z") + 1)),
      ArrowDown: () => (e.altKey ? set(selected, "y", get(selected, "y") + step) : set(selected, "z", get(selected, "z") - 1)),
      ArrowLeft: () => e.altKey && set(selected, "x", get(selected, "x") - step),
      ArrowRight: () => e.altKey && set(selected, "x", get(selected, "x") + step),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
    render();
  });

  render();
})();

/* Cartelera: filtra los eventos por disciplina (data-filtro del botón = data-disciplina del evento).
   Puede haber varias listas [data-cartelera] (p. ej. una por mes): si una queda vacía,
   se oculta su grupo [data-grupo] completo */
(function () {
  const filtros = document.querySelector("#cartelera .filtros");
  const listas = document.querySelectorAll("[data-cartelera]");
  if (!filtros || !listas.length) return;
  const vacia = document.querySelector("[data-cartelera-vacia]");

  filtros.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filtro]");
    if (!btn) return;
    for (const b of filtros.querySelectorAll("button")) {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    }
    let total = 0;
    for (const lista of listas) {
      let visibles = 0;
      for (const ev of lista.children) {
        const ver = btn.dataset.filtro === "todo" || ev.dataset.disciplina === btn.dataset.filtro;
        ev.hidden = !ver;
        if (ver) visibles++;
      }
      const grupo = lista.closest("[data-grupo]");
      if (grupo) grupo.hidden = visibles === 0;
      total += visibles;
    }
    if (vacia) vacia.hidden = total > 0;
  });
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
