# Slider

Slider de manipulación directa que se estira si lo arrastras más allá de su límite y vuelve al soltar.

## Cuándo usarlo

Para valores continuos que se ajustan a ojo: volumen, brillo, zoom. Para un número exacto, usa un campo numérico.

## Qué pones tú

- `value` + `onValueChange` (y `onValueCommit` al soltar), o `defaultValue`.
- `min` (0), `max` (100), `step` (1).
- `aria-label` y, si el número solo no se entiende, `formatValue` (p. ej. `x => x + "%"`).
- `icon`: un nodo o una función que recibe la fracción, p. ej. `f => <VolumeIcon level={f} />`.
- Un contenedor con ancho: ocupa el 100 % (mínimo 160 px); mide 48 px de alto.

## Reglas

- Pista `surface`, relleno `fill`. El icono cambia de `on-surface` a `on-fill` justo donde lo cruza el relleno.
- Pulsar lleva el valor a ese punto; arrastrar lo mueve a la par del puntero.
- Al pasarte del límite, la forma crece con resistencia creciente (nunca más de un tercio de su ancho) y adelgaza un poco; al soltar vuelve con `back` y la velocidad que llevaba.
- Flechas ±`step`, RePág/AvPág ±10 `step`, Inicio y Fin. Empujar contra el límite con el teclado da un rebote corto.
