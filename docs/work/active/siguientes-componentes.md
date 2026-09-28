# Siguientes componentes de Mochi

> **Actualizado:** 2026-09-29. Traspaso temporal: acento cambiado a matcha, rojo de error añadido
> y componentes nuevos hechos y probados: campo de texto, diálogo y hoja, menú, selector y
> tooltip, acordeón, pestañas con contenido y piezas de movimiento, y casilla y botón de opción,
> barra y anillo de progreso y esqueleto de carga, con las correcciones de tres revisiones
> independientes; todo subido a GitHub. Siguen panel flotante, panel lateral y
> lista que se reordena. Lo pendiente de la librería en general está en el
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
- **Git:** todo subido a GitHub (`RodzCantCode/mochi`, **público**, rama `main`), incluidos
  casilla, radio, progreso y esqueleto. El usuario va a publicar el sitio de pruebas en Vercel para
  probarlo en su iPhone (compilación y carpeta, en el README, apartado «Desarrollo»).
- **Acordeón, pestañas y movimiento (hechos y subidos):** `Collapsible`, `Accordion` y
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
- **Casilla, radio, progreso y esqueleto (hechos y subidos):** `Checkbox` (con estado mixto) y
  `RadioGroup` (con `options`), que comparten `src/internal/choice.tsx`; `Progress` y
  `ProgressRing`; `Skeleton` y `SkeletonSwap` (Swap + AutoHeight). Cada uno con su página en el
  sitio de pruebas, casos límite en páginas ocultas y su ficha (`Checkbox`, `Progress`,
  `Skeleton`) en `design-system-src/components/`. Cómo se comportan está en esas fichas.
- **Tercera revisión independiente** (dos revisores con contexto limpio: comportamiento con
  React 18.2, 18.3 y 19, y accesibilidad, estilos y documentación): 18 fallos distintos con caso
  reproducible (dos los encontraron los dos), todos corregidos salvo el contraste del filo (ver
  «Bloqueos»). Los de código tienen prueba, menos el rendimiento (medido aparte) y el aviso de
  error de una casilla sin etiqueta (sin lector de pantalla con que probarlo). Los
  que más importaban: un valor `NaN` (p. ej. `0/0` al empezar una subida) dejaba la barra
  congelada y pidiendo fotogramas sin fin; marcar 300 casillas forzaba 300 recálculos de la
  página; tras reiniciar el formulario, lo enviado no coincidía con lo visible, y lo desactivado
  se enviaba; en alto contraste los radios y las barras no se veían. Uno estaba en `Swap`,
  anterior a esta tanda: la capa que sale enseñaba el contenido de cuando apareció, no el último
  (se veía al volver a cargar un `SkeletonSwap`).
- **Plan acordado:** pulir Mochi aquí antes de integrarlo en `phsport-app` (en una sesión aparte
  en esa carpeta; el mensaje para arrancarla se le dio al usuario en el chat).
- El usuario probó en su iPhone (Safari) la paleta y la hoja de «Rename» tras los arreglos:
  funcionan.

## Decisiones tomadas

- Radix se decide pieza a pieza, con su peso delante; por defecto, componentes propios. El menú
  se hizo propio. Pesos (minificado y comprimido, sin React):
  - Radix, medido el 2026-09-28 con `@radix-ui/react-dialog` 1.1.23: diálogo 13,2 kB, tooltip
    18,4 kB, popover 23,0 kB, menú desplegable 28,9 kB, selector 29,5 kB; React 67,4 kB.
  - Mochi entera: 15,8 kB antes de la primera tanda, 32,7 kB antes de la casilla, el progreso
    y el esqueleto, 37,2 kB ahora (medido el 2026-09-29 con el mismo método).
  - Coste de cada pieza nueva sobre Button + CommandPalette: TextField +1,2 kB, Dialog +3,6 kB,
    Menu y ContextMenu +4,6 kB. Diálogo y menú comparten `src/internal/overlay.ts`. Sobre
    Button + Menu: Select +1,2 kB (comparte la lista del menú) y Tooltip +1,5 kB. Sobre Button +
    SegmentedControl: Presence y AutoHeight +1,5 kB, Accordion +2,9 kB, Tabs +0,8 kB. Sobre
    Button + Switch: Checkbox +3,2 kB o RadioGroup +3,3 kB (comparten el mensaje y AutoHeight),
    Progress y ProgressRing +1,7 kB, Skeleton y SkeletonSwap +0,7 kB.
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
- Casilla y radio: marcados son `solid` con la marca en `on-solid` (el punto del radio también),
  no `accent`: así se ven en oscuro, donde `solid` casi no se separa de la superficie. En
  formularios se portan como los nativos: lo desactivado no viaja y al reiniciar el formulario
  vuelven a como empezaron. `RadioGroup` usa `null` para «ninguna elegida».
- Progreso en `fill` (negro en claro, blanco roto en oscuro) sobre un surco del mismo color al
  12 %, nunca verde. Lo indeterminado va en bucle a velocidad constante (pedido por el usuario
  el 2026-09-29): el tramo cruza la barra y se encoge y estira en los bordes; el arco gira
  alargándose y acortándose. Con «reducir movimiento» se queda quieto y respira (solo
  opacidad). Un valor que no es un número cuenta como indeterminado.
- El brillo del esqueleto va fijado a la ventana (`background-attachment: fixed`), así una sola
  pasada recorre todas las formas. En Safari de iOS eso no existe: cada forma tendrá su pasada,
  a la misma velocidad.
- Alto contraste (`forced-colors`): solo lo tienen los tres componentes nuevos; lo que falta
  del resto está en el [README](../../../README.md#pendiente).
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
- **Progreso indeterminado a saltos** (el tramo avanzaba por posiciones fijas con sus bordes en
  `lead` y `trail`, como el indicador de pestañas, y el arco igual): en el iPhone del usuario
  se veía a trompicones. Se cambió a un bucle continuo.
- **Pegar el bundle en las vistas previas con un reemplazo de texto**: el minificado puede
  contener `$&`, que `String.replace` interpreta, y rompía todas las vistas previas. El
  comprobador lo inserta ahora con una función.

## Verificación realizada

El 2026-09-29, tras el último cambio de código:
- `npm run typecheck`: sin errores.
- `npm test`: 75/75 (además de lo anterior: renderizado en servidor de casilla, radio,
  progreso y esqueleto, con sus roles, estados y valores de formulario).
- `npm run test:e2e`: 163/163 en Chromium. De los tres nuevos: el negro que crece desde el
  centro, el check dibujado y transformado en raya, etiqueta pulsable, Espacio sí y Enter no,
  un solo Tab y flechas en el grupo, errores y foco al enviar, valores del formulario (también
  desactivados, `fieldset` desactivado, valor `""` y reinicio), la barra indeterminada que
  cruza a velocidad constante y se encoge y estira en los bordes, el anillo que gira a ritmo
  constante, el valor que avanza sin saltos, el anillo que acaba en check, `NaN`,
  `max` 0, la cifra que cuenta desde 0 y por enteros, el esqueleto que se funde y adapta la
  altura, lo que sale al volver a cargar, «reducir movimiento», alto contraste y la pasada en
  modo desarrollo. Sin errores de consola.
- `npm run design-system`: 42/42 vistas previas sin errores con React 18.3 (desde jsDelivr),
  marcando una casilla y eligiendo un radio; las de progreso y esqueleto cambian solas en bucle.
- Los casos de los dos revisores, repetidos tras los arreglos con React 18.2, con y sin
  StrictMode, en la aplicación de pruebas fuera del repositorio (`/tmp/claude-501/mochi-repro`,
  temporal): todos dan ya el resultado esperado; marcar 300 casillas, 0 recálculos de la página.
- Capturas revisadas a ojo en claro y oscuro, en escritorio y con colores forzados.

Sin comprobar: Safari (y el brillo del esqueleto en iOS), Firefox, pantallas táctiles reales,
lectores de pantalla reales, alto contraste real de Windows (solo emulado en Chromium), la
página del sistema de diseño vista dentro de claude.ai y los proyectos Next.js y Astro con los
componentes nuevos.

## Bloqueos

Esperan decisión del usuario:
- Si subir la versión a 0.2.0 antes de subirlo.
- **Filo de la casilla y el radio sin marcar.** El planteamiento pedía `surface-border-strong`,
  y así está, pero no llega a 3:1 (WCAG 1.4.11): 1,4:1 en claro y 1,8:1 en oscuro. Propuesta:
  un filo de `on-surface` al 45–50 % (con `color-mix` o un token nuevo).
- Publicar el sistema de diseño con las tres fichas nuevas (está generado en
  `design-system/project/`, sin publicar).

## Próximos pasos

1. Decidir el filo de la casilla y el radio, y publicar el sistema de diseño (ver «Bloqueos»).
2. Los siguientes: panel flotante, panel lateral y lista que se reordena (sin planteamiento
   todavía).
3. Al terminarlos, una revisión independiente con contexto limpio, probando también React 18
   (las tres anteriores encontraron 13, 18 y 18 fallos reales).
4. Tras cada componente: `npm test`, `npm run test:e2e`, `npm run design-system` y publicar el
   sistema de diseño en su dirección.
5. Integrar Mochi en `phsport-app` desde una sesión en esa carpeta.
6. Al cerrar la tarea: retirar este traspaso y mover lo permanente (la receta, la política de
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
- Las pruebas solo usan React 19. La comprobación del sistema de diseño usa React 18 (desde
  jsDelivr) y hace un poco de interacción (abre una sección, cambia de pestaña, marca una
  casilla y elige un radio): es lo único que prueba React 18 de forma repetible. Para más, las
  revisiones montan una aplicación de pruebas fuera del repo que importa `src/` con React 18.2 o
  18.3 por alias de Vite (`/tmp/claude-501/mochi-repro`, temporal: puede no existir).
- Los casos límite que usan las pruebas están en páginas ocultas del sitio
  (`playground/cases.tsx`, `#/_cases/<nombre>`); no salen en el menú.
- Al publicar el sistema de diseño puede aparecer una versión más nueva que la local: suele ser
  el tipo «Design System» actualizando sus propios archivos (`SKILL.md`, `artifact-type/`).
  Antes de publicar hay que comparar los archivos de `project/`.
