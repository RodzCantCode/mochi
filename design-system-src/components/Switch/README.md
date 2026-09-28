# Switch

Interruptor de encendido y apagado cuya bolita se estira al cambiar de lado.

## Cuándo usarlo

Para ajustes que se aplican al momento (notificaciones, modo compacto). Si el cambio necesita confirmarse con un botón «Save», usa una casilla normal.

## Qué pones tú

- `checked` + `onCheckedChange`, o `defaultChecked` si no lo controlas.
- Un nombre accesible: `aria-label` o `aria-labelledby` apuntando a la etiqueta visible.
- `size`: `"md"` (52 × 32, por defecto) o `"sm"` (40 × 24).
- `name` y `value` si debe viajar en un formulario.

## Reglas

- Apagado: pista `solid`; encendido: pista `accent-strong` (el matcha profundo, que se ve sobre el lienzo claro). La bolita es `thumb` con `shadow-thumb`.
- Cada borde de la bolita va en su muelle: el que va delante en `lead`, el de detrás en `trail`. Al pulsar se alarga un 22 % hacia donde va a ir.
- Se maneja con espacio o Enter; anuncia `role="switch"` y su estado.
