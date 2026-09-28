# Menu

Menú de acciones: el botón que lo abre se transforma en la lista y vuelve a ser botón al cerrar. `ContextMenu` lo abre con clic derecho o pulsación larga.

## Cuándo usarlo

Para agrupar acciones sobre algo concreto (un proyecto, una fila, una foto) que no caben o no merecen un botón cada una. Si son dos o tres acciones frecuentes, mejor botones a la vista.

## Qué pones tú

- `items`: `[{ id, label, icon?, shortcut?, destructive?, disabled?, onSelect }]` y separadores `{ type: "separator" }`. Las destructivas van al final, tras un separador.
- El botón como hijo: `<Menu items={…}><Button iconOnly aria-label="Project actions"><MoreIcon /></Button></Menu>`. Recibe solo sus atributos ARIA y su comportamiento.
- `placement`: `"bottom-start"` (por defecto), `"bottom-end"`, `"top-start"` o `"top-end"`. Para un «…» pegado a la derecha, `"bottom-end"`.
- `ContextMenu`: `<ContextMenu items={…} label="Project actions"><div>…</div></ContextMenu>`.
- `open` + `onOpenChange` si quieres controlarlo; `label` si el menú debe llamarse distinto que su botón; `minWidth` (200 px).

## Reglas

- `surface` con `radius-lg`, relleno de 8 px y `shadow-overlay`. Filas de 40 px en peso 510; iconos y atajos en `on-surface-muted`.
- La opción activa lleva un resaltado `accent` con `radius-md` que se desliza con `snappy`; en una destructiva, el resaltado es `danger`. Las destructivas van en `danger-strong`.
- Al abrir, la forma del botón crece con `morph` hasta la lista y el contenido entra con desenfoque; desde un clic derecho, crece desde el punto.
- Se coloca solo: si no cabe debajo, se abre encima; nunca se sale de la ventana. Desde un punto cerca del borde derecho se abre hacia la izquierda.
- ↑↓, Inicio y Fin mueven la opción activa, y escribir salta a la que empieza así. Enter la elige; Esc o Tab cierran. El foco vuelve al botón antes de ejecutar la opción: si esa opción abre un diálogo, el diálogo sale del mismo botón.
- En táctil, la pulsación larga dura 480 ms y se cancela si el dedo se mueve más de 8 px. Con teclado se abre con Mayús+F10.
