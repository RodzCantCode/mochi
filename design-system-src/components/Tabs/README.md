# Tabs

Pestañas con su contenido: `SegmentedControl` encima y el panel debajo.

## Cuándo usarlo

Para vistas distintas del mismo objeto (resumen, actividad, ajustes) que no hace falta ver a la vez. Para filtrar una sola vista o elegir un rango, basta el `SegmentedControl` suelto.

## Qué pones tú

- `items`: `[{ value, label, content, disabled? }]`.
- `value` + `onValueChange`, o `defaultValue`.
- `size`: `"md"` o `"sm"`; `fullWidth` para que las pestañas ocupen todo el ancho.
- `aria-label`: el nombre de la lista de pestañas.

## Reglas

- Las pestañas son el `SegmentedControl` (indicador líquido, flechas para moverse). El panel va a `space-4` debajo.
- Al cambiar, el panel viejo sale 16 px hacia un lado y el nuevo entra 16 px desde el otro, en el sentido en que va el indicador, con desenfoque; la altura se adapta con `morph`.
- Cada panel es un `tabpanel` nombrado por su pestaña y enfocable con Tab.
