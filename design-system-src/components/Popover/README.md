# Popover

Panel flotante con contenido libre que sale de su botón: el botón se transforma en el panel y vuelve a él al cerrar.

## Cuándo usarlo

Para algo pequeño que se consulta o se ajusta sin salir de la página: filtros, la ficha de una persona, un selector de color, opciones de compartir. Si son acciones sueltas, `Menu`; si hay que confirmar o rellenar un formulario largo, `Dialog`; si es una etiqueta de ayuda, `Tooltip`.

## Qué pones tú

- El botón como hijo (recibe ref, `onClick` y los atributos ARIA).
- `content`: lo de dentro. Como función recibe `{ close }`, p. ej. para un botón «Apply».
- `label`: el nombre accesible del panel (y el título de la hoja en móvil si no hay `title`). `title`: un título visible arriba.
- `open` + `onOpenChange` si lo controlas; `placement` como en `Menu`; `width` en px (si no, el de su contenido, entre 240 y 360).

## Reglas

- Panel `surface` con `radius-lg` y `shadow-overlay`; relleno de 18 × 20 px. Dentro, lo que sería superficie blanca (campos, botones `surface`) va en el tono del lienzo, como en el diálogo.
- Al abrir, la forma del botón crece hasta el panel con `morph`; si el botón era de otro tono, el nuevo crece desde el centro (sin pasar por gris) con la forma ligeramente desenfocada hasta que lo cubre; el contenido entra 80 ms después con `fadeIn` y desenfoque. Mientras está abierto, el botón se oculta: el panel es él. Al cerrar, vuelve a encogerse en el botón tal como está ahora: si ha cambiado (p. ej. «Filters» pasa a «Filters · 2» y a negro al aplicar), aterriza en su aspecto nuevo, sin salto.
- Se coloca junto al botón (6 px) en el lado pedido y se da la vuelta si no cabe; si es más alto que el espacio, se desplaza dentro.
- No es modal: el foco entra en el primer control; Tab al salir por el final lo cierra y sigue por la página, y Mayús+Tab al salir por el principio vuelve al botón. Esc o un toque fuera lo cierran (sin que el toque atraviese a lo de debajo) y el foco vuelve al botón.
- En pantallas de menos de 640 px es la hoja de `Dialog`: sube desde abajo y se cierra arrastrándola.
- El botón lleva `aria-haspopup="dialog"` y `aria-expanded`; el panel es `role="dialog"` con su nombre.
