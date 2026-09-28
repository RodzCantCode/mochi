# Checkbox y RadioGroup

Casilla y botones de opción. Al marcar, el tono `solid` crece desde el centro y dentro se dibuja la marca.

## Cuándo usarlo

- `Checkbox`: para una opción que se activa o no y se confirma con un botón («Save», «Subscribe»), o para elegir varias de una lista. Para un ajuste que se aplica al momento, usa `Switch`.
- `RadioGroup`: para elegir una sola entre pocas opciones que conviene ver a la vez, sobre todo si llevan explicación. Con muchas, `Select`; con dos o tres cortas en una barra, `SegmentedControl`.

## Qué pones tú

- `Checkbox`: `label` (visible; pulsarla también marca), `checked` + `onCheckedChange` o `defaultChecked`. `checked` admite `"indeterminate"` para el estado mixto (una casilla «todas» con solo algunas marcadas); pulsarla desde mixto la marca.
- `RadioGroup`: `options` (`[{ value, label, description?, disabled? }]`), `value` + `onValueChange` o `defaultValue` (`null` es ninguna elegida, lo que hay sin ellos), y `label` (el título del grupo) o `aria-label`. `orientation="horizontal"` las pone en fila.
- En los dos: `description` (ayuda), `error` (con texto se muestra; con `true` solo se marca), `size` (`"md"` o `"sm"`), `disabled`, y `name` (y `value` en la casilla) para que viajen en un formulario. Como los nativos: lo desactivado (también dentro de un `<fieldset disabled>`) no viaja, y al reiniciar el formulario vuelven a como empezaron.

## Reglas

- La casilla es un cuadro de 22 px con radio de 7 px (18 px y 6 px en `sm`); el botón de opción, un círculo del mismo tamaño. Sin etiqueta visible (p. ej. para elegir filas de una tabla), usa `md`: `sm` queda por debajo de los 24 px que pide un objetivo táctil. Sin marcar: `surface` con un filo de 1,5 px `surface-border-strong`, que se oscurece al pasar el ratón.
- Al marcar, una copia `solid` crece desde el centro con `snappy` (nunca se funden los tonos) y el check, en `on-solid`, se dibuja con `draw`. Al desmarcar se recoge hacia su centro. En mixto, el check se transforma en una raya.
- En el botón de opción, tras el relleno crece el punto `on-solid` con `snappy`; la opción que deja de estar elegida se recoge a la vez.
- Al pulsar, el control se hunde (escala 0,9 con `press`), también desde la etiqueta; al soltar, salir o perder el foco vuelve con `snappy`.
- Desactivada (por su prop o por un `<fieldset disabled>`): control y texto al 45 % de opacidad, sin hundirse.
- Con colores forzados (alto contraste del sistema), el filo pasa a borde y lo marcado toma el color de resaltado del sistema.
- Error: el filo pasa a `danger` y el mensaje, en `danger-strong` con el icono de alerta, entra con desenfoque bajo la etiqueta (bajo las opciones en el grupo), como en `TextField`.
- Teclado: Espacio marca la casilla; Enter no (como en una nativa). El grupo de opciones se entra con un solo Tab, en la elegida (o en la primera), y las flechas mueven y eligen a la vez, saltándose las desactivadas.
- Lectores de pantalla: `role="checkbox"` con `aria-checked` (`mixed` en mixto) y `role="radiogroup"` con sus `role="radio"`; cada control se nombra con su etiqueta y la ayuda o el error se enlazan con `aria-describedby`.
