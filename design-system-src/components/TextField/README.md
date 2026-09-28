# TextField

Campo de texto en píldora con la etiqueta dentro: sube y se encoge al enfocar o al escribir.

## Cuándo usarlo

Para cualquier dato de una línea: nombre, correo, contraseña, búsqueda. Para varias líneas hará falta otro componente.

## Qué pones tú

- `label`: la etiqueta visible, que también es el nombre accesible. Corta y en mayúscula inicial («Email»).
- `value` + `onValueChange`, o `defaultValue` si no lo controlas. El resto de atributos (`name`, `type`, `autoComplete`, `onBlur`…) llegan al `<input>`.
- `description`: una ayuda bajo el campo («At least 8 characters»).
- `error`: el texto del error, que sustituye a la ayuda. Con `true` solo se marca el campo.
- `valid`: dibuja un check de «correcto» a la derecha.
- `icon`: un icono a la izquierda, p. ej. `<SearchIcon />`.
- Con `type="password"` aparece un botón para mostrar u ocultar lo escrito (`showPasswordLabel`, `hidePasswordLabel`).

## Reglas

- Píldora `surface` de 56 px con `shadow-surface`; dentro de un diálogo va en el tono del lienzo y sin sombra.
- La etiqueta va en `body-lg` y sube 8 px encogiéndose a 12 px con `snappy`. El marcador de posición solo se ve con el campo enfocado.
- Anillo: filo de 1 px `surface-border` en reposo, 2 px `focus-ring` al enfocar, `danger` con error.
- El error va en `danger-strong` con el icono de alerta en `danger`; la ayuda, en `on-canvas-muted`. El mensaje entra con desenfoque y la fila crece con `morph`.
- El check de «correcto» va en `accent-strong` y se dibuja con `draw`.
- Valida al salir del campo o al enviar, no mientras se escribe. Al enviar con errores, lleva el foco al primero.
- El error se anuncia a lectores de pantalla (`aria-invalid` y el mensaje enlazado con `aria-describedby`). El autorrelleno del navegador también sube la etiqueta.
