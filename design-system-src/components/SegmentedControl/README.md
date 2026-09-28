# SegmentedControl

Pestañas con un indicador que viaja como un líquido: el borde de delante tira y el de detrás llega después.

## Cuándo usarlo

Para cambiar entre 2 y 5 vistas o rangos del mismo contenido (Day / Week / Month, Light / Dark). Para navegación entre páginas, usa enlaces.

## Qué pones tú

- `options`: `[{ value, label, controls?, disabled? }]`; `controls` es el id del panel que muestra la pestaña.
- `value` + `onValueChange`, o `defaultValue`.
- `aria-label` (o `aria-labelledby`) que diga qué se elige.
- `size`: `"md"` (44 px) o `"sm"` (38 px).

## Reglas

- La pista es `solid`; el indicador, `thumb`. Las etiquetas van en `on-solid-muted` y cambian a `on-thumb` exactamente por donde pasa el indicador.
- Las pestañas se reparten el ancho a partes iguales.
- Flechas, Inicio y Fin cambian de pestaña y mueven el foco.
- Si cambia el ancho (una fuente que carga, la ventana), el indicador se recoloca sin animar; solo se anima al elegir otra pestaña.
