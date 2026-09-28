# Mochi

Componentes de interfaz para React con una idea central: **una sola forma que se transforma**. Cambia de tamaño, esquinas y color con muelles suaves (con un rebote que nunca llega al 1 %) y cambia su contenido con un desenfoque corto. Negro, blanco y un verde matcha de acento (más un rojo solo para errores), con tema claro y oscuro.

Funciona en **Next.js** y **Astro** (como isla de React). Solo depende de React ≥ 18.2.

| Componente | Qué hace |
| --- | --- |
| `Button` | Normal → cargando (se encoge a círculo en su sitio, sin mover lo de al lado) → hecho (el check se dibuja). `useButtonStatus` lo gestiona solo. `variant="danger"` para acciones destructivas; `iconOnly` para un botón redondo con solo un icono. |
| `Menu`, `ContextMenu` | El botón «…» se transforma en el menú; también con clic derecho o pulsación larga. Se coloca solo para no salirse de la ventana. |
| `Switch` | Interruptor cuya bolita se estira al cambiar: cada borde va en su propio muelle. |
| `Checkbox`, `RadioGroup` | Casilla y botones de opción: al marcar, el negro crece desde el centro y el check se dibuja; el estado mixto es una raya. Las flechas mueven y eligen en el grupo. |
| `SegmentedControl` | Pestañas con indicador líquido; las etiquetas cambian de color justo por donde pasa. |
| `Slider` | Manipulación directa; al pasarte del límite se estira y al soltar vuelve con su velocidad. |
| `Select` | El campo se transforma en la lista de opciones; teclado de `<select>`. En pantallas táctiles abre el selector nativo del sistema. |
| `TextField` | La etiqueta sube al escribir; anillo de foco y de error, mensaje que entra con desenfoque, check de «correcto» y botón para ver la contraseña. |
| `MediaPlayer` | Island compacta que se abre en reproductor: play/pausa que se transforma y barra arrastrable (`Scrubber`). |
| `ChartCard`, `LineChart` | La línea se dibuja sola; tooltip con puntero o flechas; la cifra cuenta hasta su valor. |
| `CommandPalette` | Paleta ⌘K: filtra al escribir, el resaltado se desliza, Enter ejecuta, Esc cierra. `useCommandK`, `Kbd` y `CommandPaletteTrigger` incluidos. |
| `Dialog` | Ventana que crece desde el botón que la abre y vuelve a él; en pantallas estrechas, hoja que sube desde abajo y se cierra arrastrándola. |
| `Tooltip` | Etiqueta que sale del elemento al pasar el ratón o al enfocarlo; al pasar a otro elemento, viaja hasta él. No aparece en táctil. |
| `Toaster`, `toast()` | Aviso en píldora; si llega otro, la píldora se transforma en el nuevo. |
| `Accordion`, `Collapsible` | Secciones que se abren con muelle; abrir una puede cerrar la otra en el mismo movimiento. La búsqueda del navegador abre la sección donde encuentra el texto. |
| `Tabs` | Pestañas con su contenido: el panel entra en el sentido del indicador y la altura se adapta. |
| `Progress`, `ProgressRing` | Barra y anillo de progreso: el valor avanza con un muelle; sin valor, un tramo cruza la barra sin parar, saliendo estirado y encogiéndose al final. Al terminar, el anillo se transforma en un check. |
| `Skeleton`, `SkeletonSwap` | Huecos con la forma de lo que va a llegar y un brillo que los recorre; al llegar el contenido, se funden en él y la altura se adapta. |
| `Presence`, `PresenceGroup`, `AutoHeight` | Aparecer y desaparecer con muelle (también en listas) y alturas que siguen a su contenido, para tus propias pantallas. |
| `MorphBox`, `Swap` | Las piezas base, por si quieres construir tus propios estados. |

Todos se manejan con teclado y lector de pantalla, y respetan «reducir movimiento» del sistema.

## Instalar en un proyecto

Mientras el paquete no esté publicado, se instala desde esta carpeta (desde un proyecto en `~/Developer/<proyecto>`):

```bash
npm install ../mochi --install-links
```

`--install-links` copia el paquete ya compilado en vez de enlazar la carpeta. Sin él, el proyecto cargaría el React de Mochi además del suyo y los componentes fallarían. Para recoger cambios de Mochi, vuelve a ejecutar el mismo comando.

Para un proyecto que se despliega (Vercel u otro servidor), la carpeta local no sirve: el paquete está en GitHub y se instala con `npm install github:RodzCantCode/mochi` (sin probar todavía; ver «Pendiente» al final).

Importa los estilos **una vez** y pon la fuente Geist.

### Next.js (App Router)

```bash
npm install geist
```

```tsx
// app/layout.tsx
import { GeistSans } from "geist/font/sans";
import "mochi-ui/styles.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" className={GeistSans.variable}>
      <body style={{ background: "var(--mochi-canvas)" }}>{children}</body>
    </html>
  );
}
```

Los componentes ya llevan `"use client"`: se usan directamente desde componentes de servidor.

### Astro

```bash
npx astro add react
npm install @fontsource-variable/geist
```

```astro
---
// src/layouts/Base.astro
import "@fontsource-variable/geist";
import "mochi-ui/styles.css";
---
<html lang="es" data-theme="light" style="--mochi-font-sans: 'Geist Variable', system-ui, sans-serif">
  <body style="background: var(--mochi-canvas)"><slot /></body>
</html>
```

Los componentes interactivos van como islas, con una directiva de cliente:

```astro
---
import { Switch } from "mochi-ui";
---
<Switch client:load aria-label="Notifications" />
```

## Uso

```tsx
import { Button, useButtonStatus, ArrowRightIcon, toast, Toaster } from "mochi-ui";

function Save() {
  const { status, run } = useButtonStatus(() => fetch("/api/save", { method: "POST" }));
  return (
    <>
      <Button status={status} onClick={() => run().then(() => toast("Changes saved"))} icon={<ArrowRightIcon />}>
        Save
      </Button>
      <Toaster />
    </>
  );
}
```

El sitio de pruebas (`npm run dev`, ver «Desarrollo») tiene una página por componente con ejemplos conectados; su código está en `playground/demos.tsx`.

## Temas

Pon `data-theme` en `<html>` (o en cualquier contenedor):

- `data-theme="light"`: claro (también es lo que sale sin atributo).
- `data-theme="dark"`: oscuro.
- `data-theme="system"`: sigue la preferencia del sistema operativo.

Todos los colores son variables `--mochi-*`. Para ajustar uno en un proyecto concreto basta con redefinirla (por ejemplo `--mochi-accent`) en tu CSS, sin tocar la librería.

El acento es un matcha pastel (`accent`) que siempre lleva texto oscuro encima o va sobre las formas negras; donde el verde va solo sobre el fondo claro (interruptor encendido, check de «correcto») se usa el matcha profundo (`accent-strong`). El rojo (`danger` para bordes e iconos, `danger-strong` para texto) es solo para errores y acciones destructivas. Las reglas completas están en la guía del sistema de diseño (`design-system-src/README.md`) y la página «Colores» del sitio de pruebas los enseña en los dos temas.

## Valores del sistema (tokens)

La fuente única es `tokens/tokens.json` (colores de los dos temas, tipografía, espaciado, radios y sombras) y `tokens/motion.json` (los muelles). De ahí salen:

- `mochi-ui/styles.css` y `mochi-ui/tokens.css`: variables CSS, incluidas curvas `--mochi-ease-*` y duraciones `--mochi-duration-*` equivalentes a cada muelle, para animar con CSS puro (útil en páginas de Astro sin React).
- `mochi-ui/tokens`: los mismos valores para JavaScript (servirán también en una app móvil).
- `mochi-ui/tokens.json`: el archivo fuente, en el formato del sistema de diseño de Claude Design.

Para cambiar un valor: edita el JSON y ejecuta `npm run build`. No edites `src/tokens.ts` ni `src/styles/tokens.css`, que se generan.

## Movimiento

`mochi-ui/motion` expone el motor: `Spring` (un valor que se puede redirigir a mitad de camino sin saltos de posición ni de velocidad), `useSprings` (anima valores escribiendo directamente en el DOM, sin volver a renderizar), `rubberBand` y los muelles con nombre (`springs.morph`, `springs.lead`…). Reglas de uso:

- La forma cambia con `morph`; lo pequeño (soltar, un punto que aparece) con `snappy`; hundirse al pulsar con `press`.
- En lo que se desplaza (indicador, bolita), el borde que va delante usa `lead` y el de detrás `trail`: así se estira.
- El contenido sale con `fadeOut` y entra 60 ms después con `fadeIn`, con desenfoque: nunca se solapan dos textos.
- Negro ↔ blanco no se funde (pasaría por gris): una copia de la forma en el tono nuevo crece desde su centro.

## Sistema de diseño en Claude Design

Mochi está publicado como sistema de diseño en Claude Design: https://claude.ai/artifact/WrUTHyDF11HVssiwcEgFro (privado; se comparte desde su menú Share). Tiene la guía de marca, los valores de los dos temas y cada componente con su vista previa en vivo (usa el mismo código que este paquete).

Todo lo que publica sale de este repositorio:

- `design-system-src/`: lo que se escribe a mano. `README.md` es la guía de marca; `components/<Componente>/README.md` y `preview.html`, la guía y la vista previa de cada ficha; `components/Cover/`, la portada; `uploads.json`, los ids de los iconos ya subidos.
- `scripts/build-design-system.mjs` genera en `design-system/project/` (ignorado por git) los valores, la fuente, el bundle de componentes, los estilos, los tipos, los iconos y el índice.
- `scripts/check-design-system.mjs` monta cada vista previa como lo hace Claude Design (con React 18 desde jsDelivr) en claro y en oscuro, y avisa de errores.

Para sincronizarlo después de cambiar la librería: `npm run design-system` y pedir a Claude que publique `design-system/project/` en la dirección de arriba. Si cambian los iconos, hay que subirlos de nuevo y actualizar `uploads.json`.

## Desarrollo

```bash
npm install
npm run dev        # sitio de pruebas en http://localhost:5178: una página por componente y la de colores
npm test           # compila y pasa las pruebas unitarias (muelles, contrastes, filtro, colocación del menú, SSR)
npm run test:e2e   # pruebas de interacción con Playwright (compilado y en modo desarrollo); capturas en test/out/
npm run typecheck
npm run design-system  # regenera y comprueba el sistema de diseño
```

Para publicar el sitio de pruebas (por ejemplo en Vercel, para verlo en el móvil), la orden de compilación es `npx vite build` y la carpeta que se sirve, `playground-dist`. La compilación por defecto (`npm run build`) solo compila la librería.

La carpeta `reel/` es el prototipo del vídeo con el que nació el sistema (una animación de 14 s a 120 BPM); no forma parte del paquete.

## Pendiente

- **Distribución para despliegues**: el código está en GitHub (`RodzCantCode/mochi`, público, rama `main`). Falta probar en un proyecto real la instalación con `npm install github:RodzCantCode/mochi`: al instalarse desde Git, npm debe compilarlo (`prepare`). Otra opción es un registro de npm.
- **App móvil**: cuando se elija la tecnología, los valores (`mochi-ui/tokens`) sirven tal cual; los componentes habrá que rehacerlos para esa plataforma.
- **Alto contraste**: solo la casilla, el radio, el progreso y el esqueleto tienen reglas para los colores forzados del sistema (`forced-colors`); en el resto (Switch, SegmentedControl, Slider…) el estado puede no verse con el alto contraste de Windows.
- **Colores de estado**: hay rojo de error (`danger`, `danger-strong`) y «correcto» usa el matcha profundo (`accent-strong`). No hay color de aviso (ámbar); se añadirá si algún componente lo necesita.
