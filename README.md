# Anómala · Maqueta del sitio

Maqueta HTML del sitio de Anómala, pensada para desarrollarse después como tema de WordPress.

## Cómo verla

Abrir `index.html`: es un índice con todas las páginas de la maqueta y la plantilla de WordPress que corresponde a cada una. Dentro de cada página, los menús y enlaces también funcionan.

Para ver la maqueta con un servidor local (recomendado, por las fuentes y algunas imágenes):

```bash
npx http-server -p 5173
```

y luego abrir `http://localhost:5173`.

## Estructura

- `*.html`: una página por plantilla (portada, listados, artículos, páginas).
- `style.css`: estilos del sitio, sobre Bootstrap 5.3 (cargado desde CDN).
- `script.js`: movimiento del collage del hero, modo de edición del collage (`home-page.html#editar`), filtro de la cartelera e íconos aleatorios de las entradas.
- `recortes-psd/`, `iconos-anomala/` y los `*.webp` de la raíz: imágenes del collage, íconos y papel rasgado.

Las fotos de las notas se cargan desde Unsplash. Salvo «Quiénes somos», los textos, nombres e imágenes de las notas son de ejemplo.

Desarrollado por [Maggiore](https://maggiore.cl).
