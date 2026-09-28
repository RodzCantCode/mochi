# Siguientes componentes de Mochi

> **Actualizado:** 2026-09-28. Traspaso temporal: Mochi 0.1.0 está terminada y verificada; la
> conversación se paró eligiendo qué componentes añadir y si apoyarse en Radix. Lo pendiente
> de la librería en general está en el [README](../../../README.md#pendiente); aquí solo lo de
> esta tarea.

## Objetivo

Ampliar Mochi con los componentes que más se usan en web, móvil y escritorio, manteniéndola
compacta (hoy 15,8 kB comprimidos entera) y con el mismo nivel de acabado: muelles, cambio de
contenido con desenfoque, tema claro y oscuro, teclado y lector de pantalla, pruebas y ficha en
el sistema de diseño. Hecho = cada componente nuevo en la librería, con demo en el banco de
pruebas, pruebas unitarias y de interacción en verde y su ficha publicada en el sistema de diseño.

## Estado actual

- **Hecho (0.1.0):** Button, Switch, SegmentedControl, Slider, MediaPlayer (+ PlayPauseIcon,
  Scrubber), ChartCard (+ LineChart), CommandPalette (+ Kbd, CommandPaletteTrigger, useCommandK),
  Toast (Toaster, toast), MorphBox y Swap. Motor de muelles en `src/motion/`, valores en
  `tokens/`.
- **Sistema de diseño publicado** en Claude Design: https://claude.ai/artifact/WrUTHyDF11HVssiwcEgFro
  (privado). Se regenera con `npm run design-system`; cómo, en el README.
- **Sin empezar:** ningún componente nuevo. Candidatos propuestos al usuario, por orden:
  1. **Campo de texto**: estados de foco, error y correcto; etiqueta que se desplaza al
     escribir. Sin Radix.
  2. **Hoja y diálogo**: hoja inferior en móvil, ventana centrada en escritorio; el botón que
     la abre crece hasta ella. Sin Radix: reutiliza lo que ya resuelve CommandPalette (Esc,
     fondo, foco retenido y devuelto).
  3. **Menú de acciones**: «…», clic derecho, pulsación larga; el botón se transforma en el
     menú. El más difícil por la colocación junto a los bordes: aquí es donde Radix más ayuda
     y más pesa.
  Después: tooltip (web y escritorio) y selector de opciones (en móvil suele ser mejor el nativo).
- El usuario **no ha elegido todavía** cuál empezar ni si usar Radix en el menú.

## Decisiones tomadas

- Radix se decide pieza a pieza, con su peso delante; por defecto, componentes propios. Motivo,
  medido el 2026-09-28 (minificado y comprimido, sin React, `@radix-ui/react-dialog` 1.1.23):
  Mochi entera 15,8 kB; Radix diálogo 13,2 kB, tooltip 18,4 kB, popover 23,0 kB, menú
  desplegable 28,9 kB, selector 29,5 kB; cinco piezas de Radix juntas 41,2 kB (comparten
  código); React 67,4 kB de referencia.
- Receta de un componente nuevo (la que siguieron los 9 actuales): valores de `tokens/` →
  componente en `src/components/` con `useSprings` → estilos en `src/styles/components.css`
  solo con variables `--mochi-*` → export en `src/index.ts` → pruebas (`test/unit/`, y
  `test/e2e.mjs` para la interacción) → demo en `playground/main.tsx` → guía y vista previa en
  `design-system-src/components/<Nombre>/` y su nombre en `CARDS` de
  `scripts/build-design-system.mjs` → `npm run design-system` y publicar.
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
  de la forma en el tono nuevo que crece desde el centro (en MorphBox y en el vídeo).

## Verificación realizada

El 2026-09-25, tras el último cambio de código:
- `npm run typecheck`: sin errores.
- `npm test`: 27/27 (muelles, contraste de los dos temas, filtro de la paleta, formato de
  tiempos, renderizado en servidor de cada componente).
- `npm run test:e2e`: 27/27 en Chromium (clics, arrastres, teclado, tema oscuro, movimiento
  reducido, sin errores de consola).
- `node scripts/check-design-system.mjs`: 20/20 vistas previas sin errores con React 18.
- Proyectos desechables con `--install-links`: Next.js 16.3.6 (compila, prerenderiza y funciona
  en el navegador sin errores de hidratación), Astro 7.3.5 (islas con `client:load`, sin
  errores) y Vite (compila y funciona). Eran carpetas temporales; ya no existen.

Sin comprobar: Safari, Firefox, pantallas táctiles reales y la página del sistema de diseño
vista dentro de claude.ai.

## Bloqueos

Ninguno técnico. Esperan decisión del usuario: qué componente empezar, Radix sí o no en el
menú, cómo distribuir Mochi para los despliegues (GitHub privado o npm) y si hacer commit (no hay
ninguno todavía).

## Próximos pasos

1. Preguntar al usuario qué componente empieza (propuesta: campo de texto).
2. Construirlo con la receta de arriba; hoja y diálogo reutilizando la lógica de foco y cierre
   de `CommandPalette`.
3. Antes del menú de acciones, medir la alternativa propia frente a Radix y decidir con el usuario.
4. Tras cada componente: `npm test`, `npm run test:e2e`, `npm run design-system` y publicar el
   sistema de diseño en su dirección.
5. Al cerrar la tarea: retirar este traspaso y mover lo permanente (la receta, la política de
   Radix) a documentación estable.

## Cosas que conviene saber

- `reel/` es el prototipo del vídeo (animación de 14 s). Sus dependencias no viajaron; se
  reinstalan con `npm install` dentro de `reel/` y un entorno de Python con numpy. La excepción
  del revisor de diseño para su lienzo gris cálido no se copió (ya había una configuración en el
  repo); si avisa sobre `reel/index.html`, es el lienzo que pidió el usuario.
- Los iconos del sistema de diseño están subidos como archivos del propio sistema; sus ids están
  en `design-system-src/uploads.json`. Si cambian los iconos, hay que volver a subirlos.
