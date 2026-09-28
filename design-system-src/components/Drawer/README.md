# Drawer

Panel lateral de toda la altura que entra desde un borde sobre el fondo oscurecido. Se cierra arrastrándolo hacia su borde.

## Cuándo usarlo

Para la navegación en pantallas estrechas, los detalles de algo que se ha elegido en una lista o unos filtros largos: contenido que acompaña a la página sin sustituirla. Para una pregunta o un formulario corto, `Dialog`; para algo pequeño junto a un botón, `Popover`.

## Qué pones tú

- `open` + `onOpenChange`, `title` (también es el nombre accesible) y, si quieres, `description`.
- El contenido como hijo (se desplaza si no cabe) y `actions`: los botones de abajo, fijos aunque el contenido se desplace.
- `side`: `"right"` (por defecto) o `"left"`. `width`: ancho máximo (400 px por defecto; nunca más que la pantalla menos 48 px).
- `dismissible={false}` para que no se pueda cerrar (Esc, fondo, X ni arrastre); `initialFocus`; `closeLabel` para el nombre del botón de cerrar («Close»).

## Reglas

- Panel `surface` con `radius-xl` y `shadow-overlay`, separado 8 px de los bordes de la pantalla y de toda la altura visible; fondo `scrim`. Cabecera con el título (20 px, 620) y una X en `on-surface-muted`; las acciones van abajo, sobre un filo `surface-border`.
- Entra deslizándose desde su borde con `morph` y el contenido llega 60 ms después con `fadeIn` y desenfoque; el fondo se oscurece con él. No crece desde el botón: está anclado al borde.
- Se cierra arrastrándolo hacia su borde (con el dedo o el ratón, desde cualquier sitio que no sea un control): lo sigue sin retraso; hacia fuera se resiste con el estirón elástico; al soltar se cierra si pasó un tercio de su ancho o se lanzó, y si no vuelve con `back` y la velocidad que llevaba. En vertical, el contenido se desplaza como siempre. No se abre deslizando desde el borde de la pantalla (en iOS ese gesto es «atrás»).
- Como un diálogo: `role="dialog"` modal, foco dentro (primero el del contenido) y de vuelta al cerrar, Tab no se sale, Esc y un toque en el fondo lo cierran (sin que el toque atraviese), la página no se desplaza detrás y, con el teclado de iOS, se ajusta a la parte visible.
