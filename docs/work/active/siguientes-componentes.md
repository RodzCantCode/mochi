# Siguientes componentes de Mochi

> **Actualizado:** 2026-09-28. Traspaso temporal: acento cambiado a matcha, rojo de error añadido
> y componentes nuevos hechos y probados: campo de texto, diálogo y hoja, menú, selector y
> tooltip, y acordeón, pestañas con contenido y piezas de movimiento, con las correcciones de dos
> revisiones independientes; todo subido a GitHub. Siguen casilla y botón de opción, barra de
> progreso y esqueleto de carga (planteamiento abajo). Lo pendiente de la librería en general está en el
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
- **Tras la primera prueba del usuario en su iPhone (Safari y Brave, iOS 27):**
  - Arreglado: al cargar, un botón encogía y movía a los de al lado. Ahora encoge dentro de su
    hueco (`holdSpace` en MorphBox). Medido: los vecinos se quedan quietos en todo el ciclo.
  - Cambiado sin poder probarlo en un iPhone: la paleta de comandos daba un salto al salir el
    teclado. Ahora sigue la parte visible de la pantalla (`useVisualViewport` en
    `src/internal/overlay.ts`), cabe encima del teclado y bloquea el desplazamiento de la
    página. Comprobado simulando esa parte visible en Chromium y por el usuario en su iPhone.
  - En Safari (no en Brave), la hoja de «Rename» se quedaba debajo del teclado. Ahora el diálogo
    también se coloca sobre la parte visible: la hoja sube con el teclado. Comprobado simulando
    esa parte visible en Chromium y por el usuario en su iPhone.
  - El resto de componentes le funcionó bien en el iPhone.
- **Git:** subido a GitHub (`RodzCantCode/mochi`, **público**, rama `main`): el estado anterior
  (0.1.0 en azul) y esta tanda. El usuario va a publicar el sitio de pruebas en Vercel para
  probarlo en su iPhone (compilación y carpeta, en el README, apartado «Desarrollo»).
- **Acordeón, pestañas y movimiento (hechos, sin commit):** `Collapsible`, `Accordion` y
  `AccordionItem` (contenido cerrado con `hidden="until-found"`, puesto a mano porque React no
  lo admite), `Tabs` (SegmentedControl + AutoHeight + Swap con sentido), `Presence`,
  `PresenceGroup` y `AutoHeight`. `Swap` gana `align="start"` y `slide`; las opciones de
  SegmentedControl, `id`.
- **Segunda revisión independiente** (acordeón, pestañas, movimiento, tooltip y selector): 18
  fallos con caso reproducible, todos corregidos. El grave: con React 18, abrir una sección del
  acordeón tumbaba la aplicación (bucle de actualizaciones). Otros: el tooltip no dejaba pasar
  los atributos de un Menu que lo envolviera (ni al revés), un <Suspense> podía dejar sin
  globo a todos los tooltips, el selector perdía el foco al elegir con el ratón, las filas que
  salían de PresenceGroup se desordenaban y el relleno propio hacía saltar las alturas. El
  tooltip se rehízo: su globo es un único elemento fuera del árbol de React con sus propios
  muelles, y cada Tooltip pinta su texto dentro con un portal. `className` del Tooltip va
  ahora al elemento; la clase del globo es `bubbleClassName`.
- **Selector y tooltip (subidos, luego corregidos en la revisión):** `Select` (campo de 56 px o píldora compacta; en
  táctil, `<select>` nativo encima) y `Tooltip` (un único globo que viaja de un elemento a otro).
  Menú, menú contextual y selector comparten la lista en `src/internal/listPopup.tsx`, y la
  colocación de menús y tooltips está en `src/internal/placement.ts`.
- **Plan acordado:** pulir Mochi aquí antes de integrarlo en `phsport-app` (en una sesión aparte
  en esa carpeta; el mensaje para arrancarla se le dio al usuario en el chat).
- El usuario probó en su iPhone (Safari) la paleta y la hoja de «Rename» tras los arreglos:
  funcionan.

## Decisiones tomadas

- Radix se decide pieza a pieza, con su peso delante; por defecto, componentes propios. El menú
  se hizo propio. Pesos (minificado y comprimido, sin React):
  - Radix, medido el 2026-09-28 con `@radix-ui/react-dialog` 1.1.23: diálogo 13,2 kB, tooltip
    18,4 kB, popover 23,0 kB, menú desplegable 28,9 kB, selector 29,5 kB; React 67,4 kB.
  - Mochi entera: 15,8 kB antes de esta tanda, 32,9 kB ahora.
  - Coste de cada pieza nueva sobre Button + CommandPalette: TextField +1,2 kB, Dialog +3,6 kB,
    Menu y ContextMenu +4,6 kB. Diálogo y menú comparten `src/internal/overlay.ts`. Sobre
    Button + Menu: Select +1,2 kB (comparte la lista del menú) y Tooltip +1,5 kB. Sobre Button +
    SegmentedControl: Presence y AutoHeight +1,5 kB, Accordion +2,9 kB, Tabs +0,8 kB. Mochi
    entera, 32,9 kB.
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
- `npm test`: 62/62 (además de lo anterior: contraste de los colores nuevos, colocación del
  menú, unión de refs y renderizado en servidor de los componentes nuevos).
- `npm run test:e2e`: 106/106 en Chromium (campo de texto, diálogo que crece desde el botón con
  foco retenido y devuelto, diálogos anidados, reabrir desde otro botón, `autoFocus`, hoja en
  pantalla de móvil arrastrada hasta cerrarse o vetada, menú con teclado, letras, contextual,
  colocación junto a los bordes y toque fuera sin atravesar, sin errores de consola). Una
  pasada va sobre una compilación en modo desarrollo, donde React renderiza dos veces seguidas.
- `node scripts/check-design-system.mjs`: 36/36 vistas previas sin errores con React 18,
  abriendo una sección del acordeón y cambiando de pestaña (así se habría visto el fallo de
  React 18).
- Los casos de la revisión, con React 18.2 y 19.3, con y sin StrictMode, en una aplicación de
  pruebas fuera del repositorio (`/tmp/claude-501/mochi-repro`, temporal).
- Capturas revisadas a ojo en claro y oscuro, en escritorio y a 390 px de ancho.

Sin comprobar: Safari, Firefox, pantallas táctiles reales (la pulsación larga y el arrastre de
la hoja solo se han probado con ratón simulado), lectores de pantalla reales, la página del
sistema de diseño vista dentro de claude.ai y los proyectos Next.js y Astro con los componentes
nuevos.

## Bloqueos

Esperan decisión del usuario:
- Si subir la versión a 0.2.0 antes de subirlo.
- Qué componente sigue: tooltip o selector.

## Próximos pasos

1. Los tres siguientes, pedidos por el usuario (planteamiento en «Siguientes tres»); después,
   panel flotante, panel lateral y lista que se reordena.
2. Al terminarlos, una revisión independiente con contexto limpio, probando también React 18
   (las dos anteriores encontraron 13 y 18 fallos reales).
3. Tras cada componente: `npm test`, `npm run test:e2e`, `npm run design-system` y publicar el
   sistema de diseño en su dirección.
4. Integrar Mochi en `phsport-app` desde una sesión en esa carpeta.
5. Al cerrar la tarea: retirar este traspaso y mover lo permanente (la receta, la política de
   Radix) a documentación estable.

## Siguientes tres (planteamiento, sin empezar)

- **Casilla y botón de opción** (`Checkbox`, `RadioGroup` con sus opciones). La casilla pasa
  de un cuadro con filo `surface-border-strong` a `solid` con el check en `on-solid` que se
  dibuja con `draw` (como el de Button); el cambio de tono con la copia que crece desde el
  centro, nunca fundido. Estado mixto (una raya). El botón de opción: el punto crece con
  `snappy`. Espacio marca; en el grupo, las flechas mueven y eligen (un solo Tab para entrar).
  `name` y `value` en formularios con un input nativo oculto, como Switch. Error con el anillo
  `danger`, como TextField. Etiqueta pulsable.
- **Barra de progreso** (`Progress` lineal y `ProgressRing` circular). El valor avanza con un
  muelle; sin valor, «indeterminado»: un tramo que recorre la barra con sus dos bordes en
  muelles distintos (`lead` y `trail`, como el indicador de pestañas). Al llegar al 100 %, el
  anillo se transforma en el check. `role="progressbar"` con `aria-valuenow`, y nombre.
- **Esqueleto de carga** (`Skeleton` con formas de línea, círculo y bloque). Brillo suave que
  recorre las formas (quieto con «reducir movimiento»). Una pieza para cambiar esqueleto por
  contenido: los huecos se funden en el contenido real con desenfoque y la altura se adapta
  (`Swap` con `align="start"` y `AutoHeight`). `aria-busy` en el contenedor mientras carga.

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
- Las pruebas solo usan React 19. La comprobación del sistema de diseño usa React 18 (desde
  jsDelivr) y hace un poco de interacción: es lo único que prueba React 18 de forma repetible.
- Los casos límite de diálogos y menús que usan las pruebas están en páginas ocultas del sitio
  (`playground/cases.tsx`, `#/_cases/<nombre>`); no salen en el menú.
- Al publicar el sistema de diseño puede aparecer una versión más nueva que la local: suele ser
  el tipo «Design System» actualizando sus propios archivos (`SKILL.md`, `artifact-type/`).
  Antes de publicar hay que comparar los archivos de `project/`.
