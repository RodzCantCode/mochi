# Select

Selector de opciones: el campo se transforma en la lista y el valor nuevo entra con desenfoque. En pantallas táctiles abre el selector nativo del sistema.

## Cuándo usarlo

Para elegir una opción entre varias (talla, país, orden). Con dos o tres opciones que conviene ver a la vez, mejor un `SegmentedControl`. Para acciones, `Menu`.

## Qué pones tú

- `label`: la etiqueta. En `md` se ve dentro del campo; en `sm` solo la oyen los lectores de pantalla.
- `options`: `[{ value, label, disabled? }]`.
- `value` + `onValueChange`, o `defaultValue`.
- `placeholder`: el texto mientras no hay nada elegido («Choose a country»).
- `size`: `"md"` (campo de 56 px, como `TextField`) o `"sm"` (píldora de 40 px para barras de herramientas, que cambia de ancho con la opción).
- `name` si debe viajar en un formulario; `disabled`; `placement` como en `Menu`.

## Reglas

- `md` es la misma píldora `surface` que `TextField`, con la etiqueta pequeña arriba y una flecha a la derecha en `on-surface-muted`.
- Al abrir, la forma del campo crece con `morph` hasta la lista (al menos tan ancha como el campo). La opción elegida lleva un check en `accent-strong`; la activa, el resaltado `accent` que se desliza.
- El foco se queda en el campo y el teclado es el de un `<select>`: ↑↓ o Enter abren en la opción elegida; Inicio, Fin y letras para moverse (también con el campo cerrado); Enter o Tab eligen; Esc cierra sin cambiar. Las opciones desactivadas se saltan.
- En pantallas táctiles, un `<select>` nativo invisible encima del campo recibe el toque y abre el selector del sistema. Ese mismo `<select>` es el que envía el valor en los formularios.
