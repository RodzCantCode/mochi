# Accordion y Collapsible

Secciones que se abren y se cierran. `Collapsible` es una sola; `Accordion` agrupa varias.

## Cuándo usarlo

Para contenido secundario que no hace falta ver a la vez: preguntas frecuentes, ajustes por grupos, opciones avanzadas de un formulario. Si todo es importante, déjalo abierto; si son vistas distintas del mismo tema, usa `Tabs`.

## Qué pones tú

- `Collapsible`: `title`, `icon?`, `open` + `onOpenChange` o `defaultOpen`, `disabled`.
- `Accordion` con `AccordionItem` dentro (`value`, `title`, `icon?`, `disabled?`). `value` y `defaultValue` son listas de las abiertas; `multiple` deja abrir varias; `collapsible={false}` impide cerrar la única abierta.
- `variant`: `"card"` (tarjeta `surface`, por defecto) o `"plain"` (sin fondo, con separadores, para ir dentro de otra superficie o de un formulario).
- `headingLevel`: el nivel del encabezado que envuelve cada cabecera (h3 por defecto).

## Reglas

- Tarjeta `surface` con `radius-lg` y `shadow-surface`; cabeceras de 56 px en 16 px y peso 540, separadas por un filo `surface-border` con 20 px de margen a los lados. Contenido en `body` y `on-surface-muted`.
- Al abrir, la altura crece con `morph`, la flecha gira 180° con `snappy` y el contenido entra con `fadeIn` y desenfoque 60 ms después; al cerrar, sale con `fadeOut` y la altura se recoge.
- Con una sola abierta, abrir otra cierra la anterior a la vez: la tarjeta cambia de tamaño en un solo movimiento.
- El contenido cerrado no se desmonta (lo escrito se conserva) y queda oculto con `hidden="until-found"`: la búsqueda del navegador lo encuentra y abre la sección. Una sección desactivada queda oculta del todo. Cerrada, no cuenta como región.
- Abierta, la altura sigue al contenido al momento; lo que haya dentro (unas pestañas, un aviso) anima lo suyo.
- Cada cabecera es un botón dentro de un encabezado, con `aria-expanded`; el contenido es una región nombrada por su cabecera. ↑↓, Inicio y Fin pasan de una cabecera a otra. Si se cierra con el foco dentro, el foco vuelve a la cabecera.
