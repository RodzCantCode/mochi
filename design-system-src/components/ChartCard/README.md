# ChartCard

Tarjeta con pestañas de rango, la cifra principal que cuenta hasta su valor y una gráfica de línea que se dibuja sola.

## Cuándo usarlo

Para una métrica con su evolución: ingresos, visitas, uso. La gráfica suelta es `LineChart`, para ponerla en tu propio contenedor sobre `solid`.

## Qué pones tú

- `label` («Revenue»), `value` (número) y `formatValue` (p. ej. dólares con separador de miles).
- `delta`: la variación ya formateada («+12.4%»).
- `data`: `[{ label, value }]`; las etiquetas se usan en el eje y en el tooltip.
- `ranges` + `range` + `onRangeChange` para las pestañas; cambia `data` y `value` al cambiar el rango.
- `chartLabel`: resumen para lectores de pantalla («Revenue by month»).

## Reglas

- La tarjeta es `solid` con `radius-xl` y relleno `space-5`; la línea, `accent` de 3 px; la cuadrícula, `solid-subtle`; el eje, `caption` en `on-solid-muted`.
- La línea se dibuja con `draw` al aparecer y cada vez que cambian los datos; el punto final aparece al terminar.
- El tooltip (`thumb`) sigue al puntero y se engancha al punto más cercano; con el foco en la gráfica, las flechas lo mueven y se anuncia el valor.
- Los valores también están en una tabla oculta para lectores de pantalla.
