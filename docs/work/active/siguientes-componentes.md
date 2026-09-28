# Siguientes componentes de Mochi

> **Actualizado:** 2026-09-28. Traspaso temporal: acento cambiado a matcha, rojo de error añadido
> y tres componentes nuevos (campo de texto, diálogo y hoja, menú) hechos, probados, publicados
> en el sistema de diseño y subidos a GitHub. Lo pendiente de la librería en general está en el
> [README](../../../README.md#pendiente); aquí solo lo de esta tarea.

## Objetivo

Ampliar Mochi con los componentes que más se usan en web, móvil y escritorio, manteniéndola
compacta y con el mismo nivel de acabado: muelles, cambio de contenido con desenfoque, tema claro
y oscuro, teclado y lector de pantalla, pruebas y ficha en el sistema de diseño. Hecho = cada
componente nuevo en la librería, con su página en el sitio de pruebas, pruebas unitarias y de
interacción en verde y su ficha publicada en el sistema de diseño.

## Estado actual

- **Hecho en esta tanda:**
  - Acento matcha pastel (`accent` #A9C98B, texto encima en tinta) y matcha profundo
    (`accent-strong`) para el verde que va solo sobre el lienzo claro (interruptor encendido,
    check de «correcto»). El anillo de foco también es matcha. Rojo coral para errores:
    `danger`, `on-danger` y `danger-strong` (texto).
  - `TextField`, `Dialog` (ventana que crece desde el botón; hoja en pantallas de menos de
    640 px), `Menu` y `ContextMenu` (propios, sin Radix, como eligió el usuario).
  - `Button` gana `variant="danger"` e `iconOnly`. Ocho iconos nuevos (More, Alert, Eye, EyeOff,
    Trash, Copy, Pencil, Share).
  - El banco de pruebas es ahora un sitio con menú lateral, una página por componente, la
    página «Colores» y el tema recordado (`npm run dev`, http://localhost:5178).
  - Sistema de diseño republicado (versión 6) con las tres fichas nuevas, los colores y los
    25 iconos: https://claude.ai/artifact/WrUTHyDF11HVssiwcEgFro (privado).
  - Una revisión independiente encontró 13 fallos con caso reproducible (foco que se escapaba por
    la copia del botón, diálogos anidados, Esc con `dismissible={false}`, toques que atravesaban
    el fondo, refs de React 19, hoja que no volvía si no se dejaba cerrar, reabrir desde otro
    botón, `autoFocus`, nombre del menú repetido, estilo del campo, botón del ojo). Todos
    corregidos y cubiertos por pruebas. Uno estaba en `src/internal/refs.ts`, anterior a esta
    tanda: ahora respeta la limpieza de las refs de React 19.
  - Arreglados dos fallos que solo se veían en modo desarrollo: el indicador de
    SegmentedControl saltaba sin estirarse y los botones (MorphBox) crecían desde ancho 0 al
    cargar la página.
- **Git:** subido a GitHub (`RodzCantCode/mochi`, **público**, rama `main`): el estado anterior
  (0.1.0 en azul) y esta tanda. El usuario va a publicar el sitio de pruebas en Vercel para
  probarlo en su iPhone (compilación y carpeta, en el README, apartado «Desarrollo»).
- **Siguientes candidatos:** tooltip (web y escritorio) y selector de opciones (en móvil suele
  ser mejor el nativo).

## Decisiones tomadas

- Radix se decide pieza a pieza, con su peso delante; por defecto, componentes propios. El menú
  se hizo propio. Pesos (minificado y comprimido, sin React):
  - Radix, medido el 2026-09-28 con `@radix-ui/react-dialog` 1.1.23: diálogo 13,2 kB, tooltip
    18,4 kB, popover 23,0 kB, menú desplegable 28,9 kB, selector 29,5 kB; React 67,4 kB.
  - Mochi entera: 15,8 kB antes de esta tanda, 25,5 kB ahora.
  - Coste de cada pieza nueva sobre Button + CommandPalette: TextField +1,2 kB, Dialog +3,6 kB,
    Menu y ContextMenu +4,6 kB. Diálogo y menú comparten `src/internal/overlay.ts`.
- `accent` es pastel y no pasa 3:1 sobre el lienzo claro. Por eso la prueba de contraste exige
  3:1 a `accent-strong`, y `accent` solo va sobre `solid` o con texto encima.
- Receta de un componente nuevo (la que siguieron los 12 actuales): valores de `tokens/` →
  componente en `src/components/` con `useSprings` → estilos en `src/styles/components.css`
  solo con variables `--mochi-*` → export en `src/index.ts` → pruebas (`test/unit/`, y
  `test/e2e.mjs` para la interacción) → demo en `playground/demos.tsx` y página en
  `playground/pages.tsx` → guía y vista previa en `design-system-src/components/<Nombre>/` y su
  nombre en `CARDS` de `scripts/build-design-system.mjs` → `npm run design-system` y publicar.
  Si hay iconos nuevos: añadirlos a `ICONS`, subirlos al sistema y apuntar sus ids en
  `design-system-src/uploads.json`.
- Lo que se abre encima (diálogo, menú) crece desde el botón que lo abre. Mientras está abierto,
  el botón se oculta con un contador, porque un menú y el diálogo que abre pueden salir del mismo
  botón. Al elegir una opción del menú, el foco vuelve al botón antes de ejecutarla, así el
  diálogo que abra sale de ese botón.
- Personalizar por proyecto se hace redefiniendo variables `--mochi-*` en el CSS del proyecto
  (en `:root`, en el contenedor de una página o en un componente con `className`). Probado en el
  navegador el 2026-09-28: el cambio solo afecta a lo que queda dentro.

## Intentos fallidos

- **React 18 junto al 19 como alias de npm** (`react18@npm:react@18.3.1`) para comprobar las
  vistas previas: npm lo rechaza por dependencias (ERESOLVE) sin `--legacy-peer-deps`. Se
  descartó para no dejar el repo con esa rareza; `scripts/check-design-system.mjs` carga React 18
  desde jsDelivr, como Claude Design.
- **`npm install ../mochi` sin `--install-links`** no se llegó a probar: enlazar la carpeta
  arrastra el React del propio Mochi y duplica React en el proyecto. Con `--install-links`
  (copia real) sí está probado.
- **Fundir negro y blanco** deja un gris sucio a mitad de transición. Se sustituyó por una copia
  de la forma en el tono nuevo que crece desde el centro (en MorphBox, en el diálogo, en el menú
  y en el vídeo).
- **Cerrar al bajar el dedo fuera del menú o en el fondo del diálogo** dejaba que el clic de ese
  toque atravesara hasta lo de debajo. **Cerrar con el clic** a secas cerraba el menú contextual
  al levantar el dedo de la pulsación larga. Lo que funciona: cerrar con el clic solo si el toque
  empezó fuera con la capa ya abierta.
- **Pegar el bundle en las vistas previas con un reemplazo de texto**: el minificado puede
  contener `$&`, que `String.replace` interpreta, y rompía todas las vistas previas. El
  comprobador lo inserta ahora con una función.

## Verificación realizada

El 2026-09-28, tras el último cambio de código:
- `npm run typecheck`: sin errores.
- `npm test`: 44/44 (además de lo anterior: contraste de los colores nuevos, colocación del
  menú, unión de refs y renderizado en servidor de los componentes nuevos).
- `npm run test:e2e`: 62/62 en Chromium (campo de texto, diálogo que crece desde el botón con
  foco retenido y devuelto, diálogos anidados, reabrir desde otro botón, `autoFocus`, hoja en
  pantalla de móvil arrastrada hasta cerrarse o vetada, menú con teclado, letras, contextual,
  colocación junto a los bordes y toque fuera sin atravesar, sin errores de consola). Una
  pasada va sobre una compilación en modo desarrollo, donde React renderiza dos veces seguidas.
- `node scripts/check-design-system.mjs`: 26/26 vistas previas sin errores con React 18.
- Capturas revisadas a ojo en claro y oscuro, en escritorio y a 390 px de ancho.

Sin comprobar: Safari, Firefox, pantallas táctiles reales (la pulsación larga y el arrastre de
la hoja solo se han probado con ratón simulado), lectores de pantalla reales, la página del
sistema de diseño vista dentro de claude.ai y los proyectos Next.js y Astro con los componentes
nuevos.

## Bloqueos

Ninguno técnico. Esperan decisión del usuario:
- Si subir la versión a 0.2.0 antes de subirlo.
- Qué componente sigue: tooltip o selector.

## Próximos pasos

1. Recoger lo que el usuario vea en el iPhone (Safari real y táctil real: pulsación larga,
   arrastre de la hoja, teclado sobre los campos).
2. Siguiente componente con la receta de arriba (propuesta: tooltip, que reutiliza la
   colocación del menú).
3. Tras cada componente: `npm test`, `npm run test:e2e`, `npm run design-system` y publicar el
   sistema de diseño en su dirección.
4. Al cerrar la tarea: retirar este traspaso y mover lo permanente (la receta, la política de
   Radix) a documentación estable.

## Cosas que conviene saber

- `reel/` es el prototipo del vídeo (animación de 14 s). Sus dependencias no viajaron; se
  reinstalan con `npm install` dentro de `reel/` y un entorno de Python con numpy. La excepción
  del revisor de diseño para su lienzo gris cálido no se copió (ya había una configuración en el
  repo); si avisa sobre `reel/index.html`, es el lienzo que pidió el usuario.
- Los iconos del sistema de diseño están subidos como archivos del propio sistema; sus ids están
  en `design-system-src/uploads.json`. Si cambian los iconos, hay que volver a subirlos.
- En los componentes, no apuntes en una ref durante el render nada que decida una animación
  (si anima o salta, desde dónde): en modo desarrollo React renderiza dos veces y la segunda ve
  el cambio como ya hecho. Se apunta en un efecto, cuando ya se ha pintado. Así se arreglaron
  SegmentedControl (saltaba sin estirarse) y MorphBox (crecía desde 0 al cargar).
- Los casos límite de diálogos y menús que usan las pruebas están en páginas ocultas del sitio
  (`playground/cases.tsx`, `#/_cases/<nombre>`); no salen en el menú.
- Al publicar el sistema de diseño puede aparecer una versión más nueva que la local: suele ser
  el tipo «Design System» actualizando sus propios archivos (`SKILL.md`, `artifact-type/`).
  Antes de publicar hay que comparar los archivos de `project/`.
